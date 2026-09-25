import { prisma } from '../config/db.js';
import { BusinessHealthService } from './business-health.service.js';
import { ReviewIntelligenceService } from './review-intelligence.service.js';
import { EntitlementService } from './entitlement.service.js';

export interface InsightItem {
  id?: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  actionUrl?: string;
  isDismissed: boolean;
  metadata?: Record<string, any>;
  calculatedAt: Date;
}

export class AutomatedInsightsService {
  /**
   * Generates and returns dynamic recommendations calculated by backend heuristic engines
   */
  static async getInsights(businessId: string): Promise<{ insights: InsightItem[] }> {
    const [health, intelligence, usage] = await Promise.all([
      BusinessHealthService.evaluateBusinessHealth(businessId),
      ReviewIntelligenceService.getBusinessIntelligence(businessId),
      EntitlementService.getBusinessUsage(businessId),
    ]);

    const generated: Array<Omit<InsightItem, 'id' | 'isDismissed' | 'calculatedAt'>> = [];

    // 1. Missing NFC Cards Opportunity
    if (health.metrics.activeNfcCards === 0) {
      generated.push({
        type: 'MISSING_NFC_SETUP',
        severity: 'INFO',
        title: 'Deploy NFC Review Cards',
        description:
          'Your business has zero active NFC cards. Physical NFC cards convert customer interactions up to 3x faster than QR codes alone. Assign a card from your inventory.',
        actionUrl: '/dashboard/nfc',
      });
    }

    // 2. High-Performing NFC Card Detection
    const topCard = intelligence.topPerformers.nfcCards[0];
    if (topCard && topCard.totalEvents >= 3 && topCard.percentageOfTotal >= 40) {
      generated.push({
        type: 'HIGH_PERFORMING_NFC',
        severity: 'SUCCESS',
        title: `Card "${topCard.label}" is Driving High Engagement`,
        description: `This NFC card generated ${topCard.totalEvents} review taps (${topCard.percentageOfTotal}% of total). Consider deploying identical cards at secondary cash registers or dining tables.`,
        actionUrl: `/dashboard/nfc/${topCard.id}`,
        metadata: { cardId: topCard.id, tapCount: topCard.totalEvents },
      });
    }

    // 3. Traffic Growth Detection
    if (intelligence.velocity.weeklyChangePercent >= 20 && intelligence.velocity.current7Days >= 5) {
      generated.push({
        type: 'TRAFFIC_GROWTH',
        severity: 'SUCCESS',
        title: `Weekly Review Traffic Grew by +${intelligence.velocity.weeklyChangePercent}%`,
        description: `Your location logged ${intelligence.velocity.current7Days} review redirects this week compared to ${intelligence.velocity.previous7Days} last week. Your customer review momentum is surging!`,
        actionUrl: '/dashboard/analytics',
        metadata: { growthPercent: intelligence.velocity.weeklyChangePercent },
      });
    }

    // 4. Traffic Decline Detection
    if (intelligence.velocity.weeklyChangePercent <= -25 && intelligence.velocity.previous7Days >= 5) {
      generated.push({
        type: 'TRAFFIC_DECLINE',
        severity: 'WARNING',
        title: `Review Tap Volume Dropped by ${Math.abs(intelligence.velocity.weeklyChangePercent)}%`,
        description: `Customer redirects dropped from ${intelligence.velocity.previous7Days} to ${intelligence.velocity.current7Days} this week. Remind front-desk and checkout staff to present review stands to happy customers.`,
        actionUrl: '/dashboard/analytics',
        metadata: { dropPercent: Math.abs(intelligence.velocity.weeklyChangePercent) },
      });
    }

    // 5. Low Activity Dormancy Warning
    if (
      health.metrics.daysSinceLastScan === null ||
      health.metrics.daysSinceLastScan >= 7
    ) {
      generated.push({
        type: 'LOW_ACTIVITY_WARNING',
        severity: 'WARNING',
        title: 'Low Customer Review Activity',
        description:
          health.metrics.daysSinceLastScan === null
            ? 'No customer scans recorded yet. Ensure your QR stand and NFC cards are visibly placed where customers pay.'
            : `No customer review scans recorded in the last ${health.metrics.daysSinceLastScan} days. Check that your display stands are clearly visible to customers.`,
        actionUrl: '/dashboard/businesses',
      });
    }

    // 6. Plan Quota Warning
    const monthlyEventsUsagePercent =
      usage.limits.maxMonthlyEvents > 0
        ? Math.round((usage.usage.monthlyTotalEvents / usage.limits.maxMonthlyEvents) * 100)
        : 0;

    if (monthlyEventsUsagePercent >= 80) {
      generated.push({
        type: 'PLAN_USAGE_WARNING',
        severity: monthlyEventsUsagePercent >= 100 ? 'CRITICAL' : 'WARNING',
        title: `Monthly Event Limit Reached ${monthlyEventsUsagePercent}%`,
        description: `You have consumed ${usage.usage.monthlyTotalEvents} of ${usage.limits.maxMonthlyEvents} monthly scans. Upgrade your plan to prevent customer redirect capping.`,
        actionUrl: '/dashboard/subscription',
        metadata: { usagePercent: monthlyEventsUsagePercent },
      });
    }

    // 7. Team Seat Capacity Warning
    if (usage.isLimitReached.teamMembers) {
      generated.push({
        type: 'TEAM_CAPACITY_REACHED',
        severity: 'INFO',
        title: 'Team Seat Limit Reached',
        description: `All ${usage.limits.maxTeamMembers} team seat(s) for your ${usage.plan.name} plan are occupied. Upgrade your subscription tier to add more managers and staff.`,
        actionUrl: '/dashboard/subscription',
      });
    }

    // Sync generated insights to database
    const now = new Date();
    for (const item of generated) {
      const existing = await prisma.businessInsight.findFirst({
        where: { businessId, type: item.type },
      });

      if (!existing) {
        await prisma.businessInsight.create({
          data: {
            businessId,
            type: item.type,
            severity: item.severity,
            title: item.title,
            description: item.description,
            actionUrl: item.actionUrl || null,
            metadata: item.metadata ? (item.metadata as any) : undefined,
            calculatedAt: now,
          },
        });
      } else if (!existing.isDismissed) {
        await prisma.businessInsight.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            description: item.description,
            severity: item.severity,
            calculatedAt: now,
          },
        });
      }
    }

    // Fetch active non-dismissed insights
    const storedInsights = await prisma.businessInsight.findMany({
      where: { businessId, isDismissed: false },
      orderBy: { calculatedAt: 'desc' },
      take: 10,
    });

    const insights: InsightItem[] = storedInsights.map((s) => ({
      id: s.id,
      type: s.type,
      severity: s.severity as any,
      title: s.title,
      description: s.description,
      actionUrl: s.actionUrl || undefined,
      isDismissed: s.isDismissed,
      metadata: s.metadata ? (s.metadata as any) : undefined,
      calculatedAt: s.calculatedAt,
    }));

    return { insights };
  }

  /**
   * Dismisses an insight recommendation
   */
  static async dismissInsight(businessId: string, insightId: string) {
    const insight = await prisma.businessInsight.findFirst({
      where: { id: insightId, businessId },
    });

    if (!insight) {
      const error: any = new Error('Insight not found');
      error.statusCode = 404;
      throw error;
    }

    return prisma.businessInsight.update({
      where: { id: insightId },
      data: { isDismissed: true },
    });
  }
}
