import { prisma } from '../config/db.js';
import { EntitlementService } from './entitlement.service.js';

export type BusinessHealthStatus = 'HEALTHY' | 'WARNING' | 'INACTIVE';

export interface HealthScoreResult {
  status: BusinessHealthStatus;
  score: number;
  breakdown: {
    activityScore: number;
    volumeScore: number;
    hardwareScore: number;
    subscriptionScore: number;
  };
  metrics: {
    daysSinceLastScan: number | null;
    lastScanAt: Date | null;
    scansLast30Days: number;
    scansLast7Days: number;
    activeNfcCards: number;
    activeQrStands: number;
    hasPlaceId: boolean;
    subscriptionStatus: string;
  };
  factors: string[];
}

export class BusinessHealthService {
  /**
   * Evaluates and scores business performance and operational health
   */
  static async evaluateBusinessHealth(businessId: string): Promise<HealthScoreResult> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [business, sub, lastScan, scansLast30Days, scansLast7Days, activeNfcCards, activeQrStands] =
      await Promise.all([
        prisma.business.findUnique({
          where: { id: businessId },
          select: {
            id: true,
            name: true,
            status: true,
            googlePlaceId: true,
            googleReviewUrl: true,
          },
        }),
        EntitlementService.getOrProvisionSubscription(businessId),
        prisma.scanEvent.findFirst({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        prisma.scanEvent.count({
          where: { businessId, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.scanEvent.count({
          where: { businessId, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.nfcCard.count({
          where: { businessId, status: 'ACTIVE' },
        }),
        prisma.tapSource.count({
          where: { businessId, type: 'QR_CODE', isActive: true },
        }),
      ]);

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    const factors: string[] = [];

    // 1. Activity Recency Score (max 30 pts)
    let activityScore = 0;
    let daysSinceLastScan: number | null = null;

    if (lastScan) {
      const diffMs = now.getTime() - lastScan.createdAt.getTime();
      daysSinceLastScan = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (daysSinceLastScan === 0) {
        activityScore = 30;
        factors.push('Recent review interaction detected within the last 24 hours');
      } else if (daysSinceLastScan <= 3) {
        activityScore = 25;
        factors.push('Active customer flow: Scanned within the last 3 days');
      } else if (daysSinceLastScan <= 7) {
        activityScore = 20;
        factors.push('Customer scans recorded within the past week');
      } else if (daysSinceLastScan <= 14) {
        activityScore = 10;
        factors.push('Activity slowing: Last scan occurred over a week ago');
      } else {
        activityScore = 0;
        factors.push(`Dormant activity: No customer scans recorded for ${daysSinceLastScan} days`);
      }
    } else {
      activityScore = 0;
      factors.push('Zero customer scans recorded since creation');
    }

    // 2. Volume Score (max 25 pts)
    let volumeScore = 0;
    if (scansLast30Days >= 50) {
      volumeScore = 25;
      factors.push(`Strong review engagement: ${scansLast30Days} scans in past 30 days`);
    } else if (scansLast30Days >= 20) {
      volumeScore = 20;
      factors.push(`Consistent scan volume: ${scansLast30Days} scans in past 30 days`);
    } else if (scansLast30Days >= 5) {
      volumeScore = 15;
      factors.push(`Moderate volume: ${scansLast30Days} scans in past 30 days`);
    } else if (scansLast30Days >= 1) {
      volumeScore = 8;
      factors.push(`Low volume: Only ${scansLast30Days} scan(s) in past 30 days`);
    } else {
      volumeScore = 0;
      factors.push('Zero scans in the last 30 days');
    }

    // 3. Hardware & Profile Setup Score (max 25 pts)
    let hardwareScore = 0;
    if (activeNfcCards > 0) {
      hardwareScore += 15;
      factors.push(`${activeNfcCards} active ReviewTap NFC card(s) deployed`);
    } else {
      factors.push('No active NFC review cards deployed');
    }

    if (business.googlePlaceId && business.googleReviewUrl) {
      hardwareScore += 10;
      factors.push('Google Place ID and Direct Review destination configured');
    } else {
      factors.push('Google Place ID missing from business profile');
    }

    // 4. Subscription Health Score (max 20 pts)
    let subscriptionScore = 0;
    if (sub.status === 'ACTIVE') {
      subscriptionScore = 20;
      factors.push(`Active subscription (${sub.plan.name}) in good standing`);
    } else if (sub.status === 'TRIALING') {
      subscriptionScore = 15;
      factors.push('Active trial subscription period');
    } else if (sub.status === 'PAST_DUE') {
      subscriptionScore = 5;
      factors.push('Subscription payment past due');
    } else {
      subscriptionScore = 0;
      factors.push(`Subscription is ${sub.status.toLowerCase()}`);
    }

    const totalScore = activityScore + volumeScore + hardwareScore + subscriptionScore;

    // Classification Rule:
    let status: BusinessHealthStatus;
    if (totalScore >= 70 && sub.status === 'ACTIVE') {
      status = 'HEALTHY';
    } else if (
      totalScore >= 40 ||
      (daysSinceLastScan !== null && daysSinceLastScan <= 14) ||
      sub.status === 'PAST_DUE'
    ) {
      status = 'WARNING';
    } else {
      status = 'INACTIVE';
    }

    return {
      status,
      score: totalScore,
      breakdown: {
        activityScore,
        volumeScore,
        hardwareScore,
        subscriptionScore,
      },
      metrics: {
        daysSinceLastScan,
        lastScanAt: lastScan ? lastScan.createdAt : null,
        scansLast30Days,
        scansLast7Days,
        activeNfcCards,
        activeQrStands,
        hasPlaceId: Boolean(business.googlePlaceId),
        subscriptionStatus: sub.status,
      },
      factors,
    };
  }
}
