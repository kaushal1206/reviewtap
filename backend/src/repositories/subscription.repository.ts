import { Prisma, Subscription, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface SubscriptionListFilter {
  status?: SubscriptionStatus;
  planId?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface BusinessUsageMetrics {
  activeQrSources: number;
  totalQrSources: number;
  activeNfcCards: number;
  totalNfcCards: number;
  monthlyTotalEvents: number;
  monthlyQrScans: number;
  monthlyNfcTaps: number;
}

export class SubscriptionRepository {
  static async findById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            status: true,
          },
        },
      },
    });
  }

  static async findByBusinessId(businessId: string) {
    return prisma.subscription.findUnique({
      where: { businessId },
      include: {
        plan: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            status: true,
          },
        },
      },
    });
  }

  static async findByOwnerId(ownerId: string) {
    return prisma.subscription.findMany({
      where: {
        business: {
          ownerId,
          deletedAt: null,
        },
      },
      include: {
        plan: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findMany(filter: SubscriptionListFilter = {}, pagination: PaginationOptions = {}) {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.planId ? { planId: filter.planId } : {}),
      ...(filter.search
        ? {
            business: {
              name: { contains: filter.search, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          plan: true,
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              ownerId: true,
              status: true,
              owner: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total, page, limit };
  }

  static async create(data: Prisma.SubscriptionCreateInput) {
    return prisma.subscription.create({
      data,
      include: {
        plan: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            status: true,
          },
        },
      },
    });
  }

  static async update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({
      where: { id },
      data,
      include: {
        plan: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Authoritative real-time database usage calculation
   * Uses efficient indexed database count queries.
   */
  static async getBusinessUsage(
    businessId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): Promise<BusinessUsageMetrics> {
    const [
      activeQrSources,
      totalQrSources,
      activeNfcCards,
      totalNfcCards,
      monthlyTotalEvents,
      monthlyQrScans,
      monthlyNfcTaps,
    ] = await Promise.all([
      prisma.tapSource.count({
        where: { businessId, type: 'QR_CODE', isActive: true },
      }),
      prisma.tapSource.count({
        where: { businessId },
      }),
      prisma.nfcCard.count({
        where: { businessId, status: { in: ['ASSIGNED', 'ACTIVE'] } },
      }),
      prisma.nfcCard.count({
        where: { businessId, status: { not: 'UNASSIGNED' } },
      }),
      prisma.scanEvent.count({
        where: {
          businessId,
          createdAt: {
            gte: currentPeriodStart,
            lt: currentPeriodEnd,
          },
        },
      }),
      prisma.scanEvent.count({
        where: {
          businessId,
          sourceType: 'QR',
          createdAt: {
            gte: currentPeriodStart,
            lt: currentPeriodEnd,
          },
        },
      }),
      prisma.scanEvent.count({
        where: {
          businessId,
          sourceType: 'NFC',
          createdAt: {
            gte: currentPeriodStart,
            lt: currentPeriodEnd,
          },
        },
      }),
    ]);

    return {
      activeQrSources,
      totalQrSources,
      activeNfcCards,
      totalNfcCards,
      monthlyTotalEvents,
      monthlyQrScans,
      monthlyNfcTaps,
    };
  }
}
