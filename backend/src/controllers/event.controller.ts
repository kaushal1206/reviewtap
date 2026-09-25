import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service.js';
import { HTTP_STATUS } from '../constants/index.js';
import { ScanSourceType } from '@prisma/client';

export class EventController {
  static async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const businessId = req.query.businessId as string | undefined;
      const sourceType = req.query.sourceType as ScanSourceType | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await EventService.getEvents(req.user, {
        businessId,
        sourceType,
        startDate,
        endDate,
        search,
        page,
        limit,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
