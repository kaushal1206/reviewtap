import { NfcCard, NfcCardStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface NfcCardListFilter {
  businessId?: string;
  businessIds?: string[];
  status?: NfcCardStatus;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class NfcRepository {
  static async create(data: Prisma.NfcCardCreateInput): Promise<NfcCard> {
    return prisma.nfcCard.create({
      data,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            googleReviewUrl: true,
          },
        },
      },
    });
  }

  static async findById(id: string) {
    return prisma.nfcCard.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            googleReviewUrl: true,
            status: true,
          },
        },
        _count: {
          select: { scanEvents: true },
        },
      },
    });
  }

  static async findByPublicId(publicId: string) {
    return prisma.nfcCard.findUnique({
      where: { publicId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            googleReviewUrl: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  static async findMany(
    filter: NfcCardListFilter,
    pagination: PaginationOptions = {}
  ): Promise<{ cards: any[]; total: number }> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NfcCardWhereInput = {
      ...(filter.businessId ? { businessId: filter.businessId } : {}),
      ...(filter.businessIds ? { businessId: { in: filter.businessIds } } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { publicId: { contains: filter.search, mode: 'insensitive' } },
              { label: { contains: filter.search, mode: 'insensitive' } },
              { business: { name: { contains: filter.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [cards, total] = await Promise.all([
      prisma.nfcCard.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: { scanEvents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.nfcCard.count({ where }),
    ]);

    return { cards, total };
  }

  static async update(id: string, data: Prisma.NfcCardUpdateInput): Promise<NfcCard> {
    return prisma.nfcCard.update({
      where: { id },
      data,
      include: {
        business: true,
      },
    });
  }

  static async countByFilter(filter: NfcCardListFilter) {
    const baseWhere: Prisma.NfcCardWhereInput = {
      ...(filter.businessIds ? { businessId: { in: filter.businessIds } } : {}),
      ...(filter.businessId ? { businessId: filter.businessId } : {}),
    };

    const [total, active, inactive, unassigned, retired] = await Promise.all([
      prisma.nfcCard.count({ where: baseWhere }),
      prisma.nfcCard.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.nfcCard.count({ where: { ...baseWhere, status: 'INACTIVE' } }),
      prisma.nfcCard.count({ where: { ...baseWhere, status: 'UNASSIGNED' } }),
      prisma.nfcCard.count({ where: { ...baseWhere, status: 'RETIRED' } }),
    ]);

    return { total, active, inactive, unassigned, retired };
  }

  static async getCardAnalytics(cardId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalTaps, todayTaps, last7DaysTaps, last30DaysTaps] = await Promise.all([
      prisma.scanEvent.count({ where: { nfcCardId: cardId } }),
      prisma.scanEvent.count({ where: { nfcCardId: cardId, createdAt: { gte: startOfToday } } }),
      prisma.scanEvent.count({ where: { nfcCardId: cardId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.scanEvent.count({ where: { nfcCardId: cardId, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return {
      totalTaps,
      todayTaps,
      last7DaysTaps,
      last30DaysTaps,
    };
  }
}
