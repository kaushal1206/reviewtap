import { Request, Response, NextFunction } from 'express';
import { AdminAnalyticsService } from '../services/admin-analytics.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AdminController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AdminAnalyticsService.getPlatformOverview();
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async searchBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, page, limit } = req.query;
      const data = await AdminAnalyticsService.searchBusinesses({
        search: search as string | undefined,
        status: status as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
