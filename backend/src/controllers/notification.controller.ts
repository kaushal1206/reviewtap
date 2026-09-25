import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { HTTP_STATUS } from '../constants/index.js';
import { NotificationStatus } from '@prisma/client';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as NotificationStatus | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await NotificationService.getUserNotifications(req.user!.id, {
        status,
        page,
        limit,
      });

      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await NotificationService.markAsRead(id, req.user!.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await NotificationService.archive(id, req.user!.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
