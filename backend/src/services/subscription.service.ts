import { Role, SubscriptionStatus, BillingInterval, Prisma } from '@prisma/client';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';
import { PlanRepository } from '../repositories/plan.repository.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { EntitlementService } from './entitlement.service.js';

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingInterval?: BillingInterval;
  isActive?: boolean;
  isDefault?: boolean;
  maxBusinesses?: number;
  maxQrSources?: number;
  maxNfcCards?: number;
  maxMonthlyEvents?: number;
  analyticsRetentionDays?: number;
  customBranding?: boolean;
  exportAnalytics?: boolean;
  prioritySupport?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billingInterval?: BillingInterval;
  isActive?: boolean;
  isDefault?: boolean;
  maxBusinesses?: number;
  maxQrSources?: number;
  maxNfcCards?: number;
  maxMonthlyEvents?: number;
  analyticsRetentionDays?: number;
  customBranding?: boolean;
  exportAnalytics?: boolean;
  prioritySupport?: boolean;
}

export class SubscriptionService {
  /**
   * Helper: verify user has access to this business
   */
  private static async verifyBusinessOwnership(businessId: string, user: { id: string; role: Role }) {
    const business = await BusinessRepository.findById(businessId);
    if (!business || business.deletedAt) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && business.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not have permission to manage subscriptions for this business');
      error.statusCode = 403;
      throw error;
    }

    return business;
  }

  /**
   * Get subscription details, current plan, and live usage for a business
   */
  static async getSubscription(businessId: string, user: { id: string; role: Role }) {
    await this.verifyBusinessOwnership(businessId, user);
    return EntitlementService.getBusinessUsage(businessId);
  }

  /**
   * Public / Authenticated catalog of active pricing plans
   */
  static async listAvailablePlans() {
    return PlanRepository.findMany({ isActive: true });
  }

  /**
   * Safe Plan Change Workflow (Upgrade / Downgrade)
   * Invariant: Downgrades NEVER delete existing cards or QR stands (Downgrade Safety, Section 20)
   */
  static async changePlan(businessId: string, targetPlanCode: string, user: { id: string; role: Role }) {
    await this.verifyBusinessOwnership(businessId, user);

    const targetPlan = await PlanRepository.findByCode(targetPlanCode);
    if (!targetPlan || !targetPlan.isActive) {
      const error: any = new Error(`Target plan '${targetPlanCode}' is not available`);
      error.statusCode = 400;
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }

    const currentSub = await EntitlementService.getOrProvisionSubscription(businessId);

    if (currentSub.planId === targetPlan.id && currentSub.status === 'ACTIVE') {
      const error: any = new Error('Your business is already subscribed to this plan');
      error.statusCode = 400;
      error.code = 'ALREADY_ON_PLAN';
      throw error;
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updatedSub = await SubscriptionRepository.update(currentSub.id, {
      plan: { connect: { id: targetPlan.id } },
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    return {
      subscription: updatedSub,
      plan: targetPlan,
      message: `Successfully changed plan to ${targetPlan.name}.`,
    };
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(businessId: string, user: { id: string; role: Role }) {
    await this.verifyBusinessOwnership(businessId, user);
    const sub = await EntitlementService.getOrProvisionSubscription(businessId);

    if (sub.cancelAtPeriodEnd) {
      const error: any = new Error('Subscription is already scheduled for cancellation at the end of the billing period');
      error.statusCode = 400;
      error.code = 'SUBSCRIPTION_ALREADY_CANCELED';
      throw error;
    }

    const updated = await SubscriptionRepository.update(sub.id, {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    });

    return {
      subscription: updated,
      message: 'Subscription will cancel at the end of the current billing period. Features remain active until then.',
    };
  }

  /**
   * Reactivate a subscription that was scheduled for cancellation
   */
  static async reactivateSubscription(businessId: string, user: { id: string; role: Role }) {
    await this.verifyBusinessOwnership(businessId, user);
    const sub = await EntitlementService.getOrProvisionSubscription(businessId);

    if (!sub.cancelAtPeriodEnd && sub.status === 'ACTIVE') {
      const error: any = new Error('Subscription is already active');
      error.statusCode = 400;
      throw error;
    }

    const updated = await SubscriptionRepository.update(sub.id, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      status: 'ACTIVE',
    });

    return {
      subscription: updated,
      message: 'Subscription renewal has been successfully reactivated.',
    };
  }

  // ==========================================
  // SUPER ADMIN PLAN MANAGEMENT
  // ==========================================

  static async listAllPlans(user: { id: string; role: Role }) {
    if (user.role !== 'SUPER_ADMIN') {
      const error: any = new Error('Forbidden: Super Admin access required');
      error.statusCode = 403;
      throw error;
    }
    return PlanRepository.findMany({});
  }

  static async createPlan(data: CreatePlanInput, user: { id: string; role: Role }) {
    if (user.role !== 'SUPER_ADMIN') {
      const error: any = new Error('Forbidden: Super Admin access required');
      error.statusCode = 403;
      throw error;
    }

    const existing = await PlanRepository.findByCode(data.code);
    if (existing) {
      const error: any = new Error(`A plan with code '${data.code.toUpperCase()}' already exists`);
      error.statusCode = 400;
      error.code = 'DUPLICATE_PLAN_CODE';
      throw error;
    }

    return PlanRepository.create({
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      currency: data.currency || 'USD',
      billingInterval: data.billingInterval || 'MONTHLY',
      isActive: data.isActive !== undefined ? data.isActive : true,
      isDefault: Boolean(data.isDefault),
      maxBusinesses: data.maxBusinesses ?? 1,
      maxQrSources: data.maxQrSources ?? 1,
      maxNfcCards: data.maxNfcCards ?? 1,
      maxMonthlyEvents: data.maxMonthlyEvents ?? 500,
      analyticsRetentionDays: data.analyticsRetentionDays ?? 14,
      customBranding: Boolean(data.customBranding),
      exportAnalytics: Boolean(data.exportAnalytics),
      prioritySupport: Boolean(data.prioritySupport),
    });
  }

  static async updatePlan(id: string, data: UpdatePlanInput, user: { id: string; role: Role }) {
    if (user.role !== 'SUPER_ADMIN') {
      const error: any = new Error('Forbidden: Super Admin access required');
      error.statusCode = 403;
      throw error;
    }

    const plan = await PlanRepository.findById(id);
    if (!plan) {
      const error: any = new Error('Plan not found');
      error.statusCode = 404;
      throw error;
    }

    return PlanRepository.update(id, {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...(data.billingInterval ? { billingInterval: data.billingInterval } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      ...(data.maxBusinesses !== undefined ? { maxBusinesses: data.maxBusinesses } : {}),
      ...(data.maxQrSources !== undefined ? { maxQrSources: data.maxQrSources } : {}),
      ...(data.maxNfcCards !== undefined ? { maxNfcCards: data.maxNfcCards } : {}),
      ...(data.maxMonthlyEvents !== undefined ? { maxMonthlyEvents: data.maxMonthlyEvents } : {}),
      ...(data.analyticsRetentionDays !== undefined ? { analyticsRetentionDays: data.analyticsRetentionDays } : {}),
      ...(data.customBranding !== undefined ? { customBranding: data.customBranding } : {}),
      ...(data.exportAnalytics !== undefined ? { exportAnalytics: data.exportAnalytics } : {}),
      ...(data.prioritySupport !== undefined ? { prioritySupport: data.prioritySupport } : {}),
    });
  }

  static async listAllSubscriptions(
    query: { status?: SubscriptionStatus; planId?: string; search?: string; page?: number; limit?: number },
    user: { id: string; role: Role }
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      const error: any = new Error('Forbidden: Super Admin access required');
      error.statusCode = 403;
      throw error;
    }

    return SubscriptionRepository.findMany(
      { status: query.status, planId: query.planId, search: query.search },
      { page: query.page, limit: query.limit }
    );
  }
}
