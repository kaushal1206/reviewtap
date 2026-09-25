import { Request, Response, NextFunction } from 'express';
import { ActivityLogService } from '../services/activity-log.service.js';
import { PermissionService } from '../services/permission.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class ActivityController {
  static async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const action = req.query.action as string | undefined;

      // Check capability: ACTIVITY_VIEW
      await PermissionService.enforcePermission(
        businessId,
        req.user!.id,
        req.user!.role,
        'ACTIVITY_VIEW'
      );

      const result = await ActivityLogService.getTimeline(businessId, {
        page,
        limit,
        action,
      });

      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
