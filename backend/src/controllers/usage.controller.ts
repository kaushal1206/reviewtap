import { Request, Response, NextFunction } from 'express';
import { EntitlementService } from '../services/entitlement.service.js';
import { PermissionService } from '../services/permission.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class UsageController {
  static async getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;

      await PermissionService.enforcePermission(
        businessId,
        req.user!.id,
        req.user!.role,
        'BUSINESS_VIEW'
      );

      const usage = await EntitlementService.getBusinessUsage(businessId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: usage });
    } catch (err) {
      next(err);
    }
  }
}
