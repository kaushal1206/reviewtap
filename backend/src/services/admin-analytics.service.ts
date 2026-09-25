import { prisma } from '../config/db.js';

export class AdminAnalyticsService {
  /**
   * Generates comprehensive platform-wide executive telemetry for Super Admins
   */
  static async getPlatformOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      totalScans,
      qrScans,
      nfcTaps,
      totalCards,
      activeCards,
      unassignedCards,
      subscriptions,
      scans30Days,
      recentActivities,
    ] = await Promise.all([
      prisma.business.count({ where: { deletedAt: null } }),
      prisma.business.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.user.count(),
      prisma.scanEvent.count(),
      prisma.scanEvent.count({ where: { sourceType: 'QR' } }),
      prisma.scanEvent.count({ where: { sourceType: 'NFC' } }),
      prisma.nfcCard.count(),
      prisma.nfcCard.count({ where: { status: 'ACTIVE' } }),
      prisma.nfcCard.count({ where: { status: 'UNASSIGNED' } }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      prisma.scanEvent.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    // Calculate MRR / ARR from active paid subscriptions
    let monthlyRecurringRevenue = 0;
    const planCounts: Record<string, number> = {};

    for (const sub of subscriptions) {
      const code = sub.plan.code;
      planCounts[code] = (planCounts[code] || 0) + 1;

      if (sub.plan.price > 0) {
        if (sub.plan.billingInterval === 'MONTHLY') {
          monthlyRecurringRevenue += sub.plan.price;
        } else if (sub.plan.billingInterval === 'YEARLY') {
          monthlyRecurringRevenue += Math.round(sub.plan.price / 12);
        }
      }
    }

    const annualRecurringRevenue = monthlyRecurringRevenue * 12;

    return {
      overview: {
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          inactive: totalBusinesses - activeBusinesses,
        },
        users: {
          total: totalUsers,
        },
        telemetry: {
          totalScans,
          qrScans,
          nfcTaps,
          scans30Days,
          nfcPercentage: totalScans > 0 ? Number(((nfcTaps / totalScans) * 100).toFixed(1)) : 0,
        },
        nfcInventory: {
          total: totalCards,
          active: activeCards,
          unassigned: unassignedCards,
          utilizationPercent:
            totalCards > 0 ? Number(((activeCards / totalCards) * 100).toFixed(1)) : 0,
        },
        subscriptions: {
          totalActive: subscriptions.length,
          mrr: monthlyRecurringRevenue, // in cents
          arr: annualRecurringRevenue, // in cents
          distribution: planCounts,
        },
      },
      recentActivity: recentActivities,
    };
  }

  /**
   * Search and filter all businesses across the entire platform
   */
  static async searchBusinesses(query: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { owner: { email: { contains: query.search, mode: 'insensitive' } } },
        { owner: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, fullName: true, email: true },
          },
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              scanEvents: true,
              nfcCards: true,
              tapSources: true,
              teamMembers: true,
            },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    const formatted = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      status: b.status,
      owner: b.owner,
      plan: b.subscription?.plan?.name || 'Free Tier',
      planCode: b.subscription?.plan?.code || 'FREE',
      subscriptionStatus: b.subscription?.status || 'ACTIVE',
      totalScans: b._count.scanEvents,
      totalNfcCards: b._count.nfcCards,
      totalTeamMembers: b._count.teamMembers + 1,
      createdAt: b.createdAt,
    }));

    return {
      businesses: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
