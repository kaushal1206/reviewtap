import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const businessId = req.query.businessId as string | undefined;
      const data = await AnalyticsService.getOverview(req.user, businessId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const businessId = req.query.businessId as string | undefined;

      const data = await AnalyticsService.getTrends(req.user, days, businessId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const businessId = req.query.businessId as string | undefined;
      const data = await AnalyticsService.getSourceDistribution(req.user, businessId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
