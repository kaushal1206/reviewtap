import { Prisma, ScanSourceType } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface EventFilterOptions {
  businessIds?: string[];
  businessId?: string;
  sourceType?: ScanSourceType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class EventRepository {
  /**
   * Find paginated scan events with filters and safe metadata projection
   */
  static async findEvents(options: EventFilterOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ScanEventWhereInput = {
      // Tenant scope: ensure the queried business belongs to permitted businessIds
      ...(options.businessIds ? { businessId: { in: options.businessIds } } : {}),
      ...(options.businessId ? { businessId: options.businessId } : {}),
      ...(options.sourceType ? { sourceType: options.sourceType } : {}),
      ...(options.startDate || options.endDate
        ? {
            createdAt: {
              ...(options.startDate ? { gte: options.startDate } : {}),
              ...(options.endDate ? { lte: options.endDate } : {}),
            },
          }
        : {}),
      ...(options.search
        ? {
            OR: [
              { business: { name: { contains: options.search, mode: 'insensitive' } } },
              { browser: { contains: options.search, mode: 'insensitive' } },
              { os: { contains: options.search, mode: 'insensitive' } },
              { deviceType: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      prisma.scanEvent.findMany({
        where,
        select: {
          id: true,
          businessId: true,
          sourceType: true,
          deviceType: true,
          os: true,
          browser: true,
          country: true,
          city: true,
          createdAt: true,
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              googleReviewUrl: true,
            },
          },
          tapSource: {
            select: {
              id: true,
              shortCode: true,
              label: true,
              type: true,
            },
          },
          nfcCardId: true,
          nfcCard: {
            select: {
              id: true,
              publicId: true,
              label: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scanEvent.count({ where }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
