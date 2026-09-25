import { NotificationStatus, NotificationType } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface CreateNotificationInput {
  userId: string;
  businessId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches a notification to a specific user
   */
  static async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        businessId: input.businessId || null,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata ? (input.metadata as any) : undefined,
        status: 'UNREAD',
      },
    });
  }

  /**
   * Broadcasts a notification to all active team members and owner of a business
   */
  static async broadcastToBusiness(
    businessId: string,
    notification: Omit<CreateNotificationInput, 'userId' | 'businessId'>
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        ownerId: true,
        teamMembers: {
          select: { userId: true },
        },
      },
    });

    if (!business) return;

    const userIds = new Set<string>();
    userIds.add(business.ownerId);
    business.teamMembers.forEach((m) => userIds.add(m.userId));

    await Promise.all(
      Array.from(userIds).map((userId) =>
        this.create({
          ...notification,
          userId,
          businessId,
        })
      )
    );
  }

  /**
   * Retrieves paginated notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: { status?: NotificationStatus; page?: number; limit?: number } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options.status) {
      where.status = options.status;
    } else {
      // By default exclude ARCHIVED unless explicitly requested
      where.status = { in: ['UNREAD', 'READ'] };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          business: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, status: 'UNREAD' },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marks a single notification as READ
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notif) {
      const error: any = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all UNREAD notifications as READ for a user
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  /**
   * Archives a notification
   */
  static async archive(notificationId: string, userId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notif) {
      const error: any = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'ARCHIVED',
      },
    });
  }
}
