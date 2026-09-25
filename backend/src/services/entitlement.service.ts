import { SubscriptionRepository, BusinessUsageMetrics } from '../repositories/subscription.repository.js';
import { PlanRepository } from '../repositories/plan.repository.js';
import { BusinessRepository } from '../repositories/business.repository.js';

export class EntitlementService {
  /**
   * Lazily resolves or provisions a subscription for a business.
   * Self-heals any legacy or newly initialized business without breaking runtime execution.
   */
  static async getOrProvisionSubscription(businessId: string) {
    let sub = await SubscriptionRepository.findByBusinessId(businessId);

    if (!sub) {
      const defaultPlan = await PlanRepository.findDefault();
      if (!defaultPlan) {
        throw new Error('No default subscription plan is configured in the system.');
      }

      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      sub = await SubscriptionRepository.create({
        business: { connect: { id: businessId } },
        plan: { connect: { id: defaultPlan.id } },
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: thirtyDaysLater,
      });
    }

    if (!sub) {
      throw new Error('Failed to resolve or provision subscription');
    }

    // Check expiration if past period end
    const now = new Date();
    if (sub.status === 'ACTIVE' && sub.currentPeriodEnd < now) {
      if (sub.cancelAtPeriodEnd) {
        sub = await SubscriptionRepository.update(sub.id, {
          status: 'EXPIRED',
        });
      } else {
        // In recurring SaaS, automatically advance billing period if active
        const newStart = sub.currentPeriodEnd;
        const newEnd = new Date(newStart.getTime() + 30 * 24 * 60 * 60 * 1000);
        sub = await SubscriptionRepository.update(sub.id, {
          currentPeriodStart: newStart,
          currentPeriodEnd: newEnd,
        });
      }
    }

    if (!sub) {
      throw new Error('Failed to resolve or provision subscription');
    }

    return sub;
  }

  /**
   * Retrieves live usage and plan limit evaluation
   */
  static async getBusinessUsage(businessId: string) {
    const sub = await this.getOrProvisionSubscription(businessId);
    const usage = await SubscriptionRepository.getBusinessUsage(
      businessId,
      sub.currentPeriodStart,
      sub.currentPeriodEnd
    );

    // Fetch team member count (including owner)
    const { TeamRepository } = await import('../repositories/team.repository.js');
    const { InvitationRepository } = await import('../repositories/invitation.repository.js');
    const [teamMemberCount, pendingInvites] = await Promise.all([
      TeamRepository.countMembers(businessId),
      InvitationRepository.countPending(businessId),
    ]);

    const plan = sub.plan;
    const maxTeamMembers = plan.maxTeamMembers || 1;
    const totalCommittedSeats = teamMemberCount + pendingInvites;

    return {
      subscription: sub,
      plan,
      usage: {
        ...usage,
        activeTeamMembers: teamMemberCount,
        pendingInvitations: pendingInvites,
        totalCommittedSeats,
      },
      limits: {
        maxQrSources: plan.maxQrSources,
        maxNfcCards: plan.maxNfcCards,
        maxMonthlyEvents: plan.maxMonthlyEvents,
        maxTeamMembers,
        analyticsRetentionDays: plan.analyticsRetentionDays,
        customBranding: plan.customBranding,
        exportAnalytics: plan.exportAnalytics,
        prioritySupport: plan.prioritySupport,
      },
      remaining: {
        qrSources: Math.max(0, plan.maxQrSources - usage.activeQrSources),
        nfcCards: Math.max(0, plan.maxNfcCards - usage.activeNfcCards),
        monthlyEvents: Math.max(0, plan.maxMonthlyEvents - usage.monthlyTotalEvents),
        teamMembers: Math.max(0, maxTeamMembers - totalCommittedSeats),
      },
      isLimitReached: {
        qrSources: usage.activeQrSources >= plan.maxQrSources,
        nfcCards: usage.activeNfcCards >= plan.maxNfcCards,
        monthlyEvents: usage.monthlyTotalEvents >= plan.maxMonthlyEvents,
        teamMembers: totalCommittedSeats >= maxTeamMembers,
      },
    };
  }

  /**
   * Checks if an invitation or team member addition is within the plan seat limit
   */
  static async checkTeamMemberLimit(businessId: string) {
    const { plan, usage, limits } = await this.getBusinessUsage(businessId);

    if (usage.totalCommittedSeats >= limits.maxTeamMembers) {
      const error: any = new Error(
        `Your current plan (${plan.name}) has reached its team seat limit (${usage.totalCommittedSeats}/${limits.maxTeamMembers}). Please upgrade your subscription to invite more team members.`
      );
      error.statusCode = 403;
      error.code = 'PLAN_LIMIT_REACHED';
      error.details = {
        resource: 'TEAM_MEMBER',
        current: usage.totalCommittedSeats,
        limit: limits.maxTeamMembers,
        planCode: plan.code,
      };
      throw error;
    }
  }

  /**
   * Server-side resource limit enforcement guard
   * @throws 403 PLAN_LIMIT_REACHED if resource limit is reached
   */
  static async checkResourceLimit(businessId: string, resource: 'NFC_CARD' | 'QR_SOURCE') {
    const { plan, usage, limits } = await this.getBusinessUsage(businessId);

    if (resource === 'NFC_CARD') {
      if (usage.activeNfcCards >= limits.maxNfcCards) {
        const error: any = new Error(
          `Your current plan (${plan.name}) has reached its NFC card limit (${usage.activeNfcCards}/${limits.maxNfcCards}). Please upgrade your subscription to provision more cards.`
        );
        error.statusCode = 403;
        error.code = 'PLAN_LIMIT_REACHED';
        error.details = {
          resource: 'NFC_CARD',
          current: usage.activeNfcCards,
          limit: limits.maxNfcCards,
          planCode: plan.code,
        };
        throw error;
      }
    } else if (resource === 'QR_SOURCE') {
      if (usage.activeQrSources >= limits.maxQrSources) {
        const error: any = new Error(
          `Your current plan (${plan.name}) has reached its QR stand limit (${usage.activeQrSources}/${limits.maxQrSources}). Please upgrade your subscription to add more stands.`
        );
        error.statusCode = 403;
        error.code = 'PLAN_LIMIT_REACHED';
        error.details = {
          resource: 'QR_SOURCE',
          current: usage.activeQrSources,
          limit: limits.maxQrSources,
          planCode: plan.code,
        };
        throw error;
      }
    }
  }

  /**
   * Checks if an owner can create an additional business profile
   * Based on the highest plan tier among their active businesses (or default free)
   */
  static async checkOwnerBusinessLimit(ownerId: string) {
    const [counts, subscriptions] = await Promise.all([
      BusinessRepository.countByOwner(ownerId),
      SubscriptionRepository.findByOwnerId(ownerId),
    ]);

    // Find highest maxBusinesses allowance across owner's subscriptions
    let maxAllowed = 1;
    if (subscriptions.length > 0) {
      maxAllowed = Math.max(...subscriptions.map((s) => s.plan.maxBusinesses));
    } else {
      const defaultPlan = await PlanRepository.findDefault();
      if (defaultPlan) maxAllowed = defaultPlan.maxBusinesses;
    }

    if (counts.active >= maxAllowed) {
      const error: any = new Error(
        `You have reached the maximum number of active businesses allowed for your account tier (${counts.active}/${maxAllowed}). Please upgrade your plan to add more locations.`
      );
      error.statusCode = 403;
      error.code = 'PLAN_LIMIT_REACHED';
      error.details = {
        resource: 'BUSINESS',
        current: counts.active,
        limit: maxAllowed,
      };
      throw error;
    }
  }

  /**
   * Server-side feature entitlement guard
   */
  static async checkFeatureAccess(
    businessId: string,
    feature: 'CUSTOM_BRANDING' | 'EXPORT_ANALYTICS' | 'PRIORITY_SUPPORT'
  ) {
    const sub = await this.getOrProvisionSubscription(businessId);
    const plan = sub.plan;

    let isAllowed = false;
    let featureLabel: string = feature;

    if (feature === 'CUSTOM_BRANDING') {
      isAllowed = plan.customBranding;
      featureLabel = 'Custom Branding';
    } else if (feature === 'EXPORT_ANALYTICS') {
      isAllowed = plan.exportAnalytics;
      featureLabel = 'Analytics Export';
    } else if (feature === 'PRIORITY_SUPPORT') {
      isAllowed = plan.prioritySupport;
      featureLabel = 'Priority Support';
    }

    if (!isAllowed) {
      const error: any = new Error(
        `Feature '${featureLabel}' is not included in your current plan (${plan.name}). Please upgrade to unlock this feature.`
      );
      error.statusCode = 403;
      error.code = 'FEATURE_NOT_AVAILABLE';
      error.details = { feature, planCode: plan.code };
      throw error;
    }
  }
}
