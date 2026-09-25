import { prisma } from '../config/db.js';

export interface LogActivityInput {
  businessId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export class ActivityLogService {
  /**
   * Records a business activity event
   */
  static async log(input: LogActivityInput): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          businessId: input.businessId,
          userId: input.userId || null,
          action: input.action,
          entityType: input.entityType || null,
          entityId: input.entityId || null,
          details: input.details ? (input.details as any) : undefined,
          ipAddress: input.ipAddress || null,
        },
      });
    } catch (err) {
      console.error('Failed to record activity log (non-fatal):', err);
    }
  }

  /**
   * Retrieves paginated activity timeline for a business
   */
  static async getTimeline(
    businessId: string,
    options: { page?: number; limit?: number; action?: string } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (options.action) {
      where.action = options.action;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      activities: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
