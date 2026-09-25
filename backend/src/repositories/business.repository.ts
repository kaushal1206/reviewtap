import { Business, BusinessStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface BusinessListFilter {
  ownerId?: string;
  memberUserId?: string;
  status?: BusinessStatus;
  search?: string;
  includeArchived?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class BusinessRepository {
  static async create(data: Prisma.BusinessCreateInput): Promise<Business> {
    return prisma.business.create({
      data,
      include: {
        tapSources: true,
      },
    });
  }

  static async findById(id: string): Promise<(Business & { tapSources: any[]; _count?: { scanEvents: number } }) | null> {
    return prisma.business.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        tapSources: true,
        _count: {
          select: { scanEvents: true },
        },
      },
    });
  }

  static async findBySlug(slug: string): Promise<(Business & { tapSources: any[] }) | null> {
    return prisma.business.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include: {
        tapSources: {
          where: { isActive: true },
        },
      },
    });
  }

  static async findMany(
    filter: BusinessListFilter,
    pagination: PaginationOptions = {}
  ): Promise<{ businesses: (Business & { tapSources: any[]; _count: { scanEvents: number } })[]; total: number }> {
    const { ownerId, memberUserId, status, search, includeArchived = false } = filter;
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BusinessWhereInput = {
      deletedAt: null,
      ...(ownerId ? { ownerId } : {}),
      ...(memberUserId
        ? {
            OR: [
              { ownerId: memberUserId },
              { teamMembers: { some: { userId: memberUserId } } },
            ],
          }
        : {}),
      ...(status ? { status } : includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { slug: { contains: search, mode: 'insensitive' } },
                  { category: { contains: search, mode: 'insensitive' } },
                  { address: { contains: search, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : {}),
    };

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          tapSources: true,
          _count: {
            select: { scanEvents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);

    return { businesses, total };
  }

  static async update(id: string, data: Prisma.BusinessUpdateInput): Promise<Business> {
    return prisma.business.update({
      where: { id },
      data,
      include: {
        tapSources: true,
        _count: {
          select: { scanEvents: true },
        },
      },
    });
  }

  static async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
    const isActive = status === 'ACTIVE';
    return prisma.business.update({
      where: { id },
      data: {
        status,
        isActive,
      },
      include: {
        tapSources: true,
      },
    });
  }

  static async softDelete(id: string): Promise<Business> {
    return prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
        isActive: false,
      },
    });
  }

  static async countByOwner(ownerId?: string): Promise<{ total: number; active: number; inactive: number; archived: number }> {
    const baseWhere: Prisma.BusinessWhereInput = {
      deletedAt: null,
      ...(ownerId ? { ownerId } : {}),
    };

    const [total, active, inactive, archived] = await Promise.all([
      prisma.business.count({ where: baseWhere }),
      prisma.business.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.business.count({ where: { ...baseWhere, status: 'INACTIVE' } }),
      prisma.business.count({ where: { deletedAt: null, ...(ownerId ? { ownerId } : {}), status: 'ARCHIVED' } }),
    ]);

    return { total, active, inactive, archived };
  }
}
