import { Request, Response, NextFunction } from 'express';
import { ReviewIntelligenceService } from '../services/review-intelligence.service.js';
import { BusinessHealthService } from '../services/business-health.service.js';
import { AutomatedInsightsService } from '../services/automated-insights.service.js';
import { PermissionService } from '../services/permission.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class IntelligenceController {
  static async getIntelligence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;

      await PermissionService.enforcePermission(
        businessId,
        req.user!.id,
        req.user!.role,
        'ANALYTICS_VIEW'
      );

      const result = await ReviewIntelligenceService.getBusinessIntelligence(businessId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;

      await PermissionService.enforcePermission(
        businessId,
        req.user!.id,
        req.user!.role,
        'BUSINESS_HEALTH_VIEW'
      );

      const result = await BusinessHealthService.evaluateBusinessHealth(businessId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;

      await PermissionService.enforcePermission(
        businessId,
        req.user!.id,
        req.user!.role,
        'INSIGHTS_VIEW'
      );

      const result = await AutomatedInsightsService.getInsights(businessId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async dismissInsight(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const insightId = req.params.insightId as string;

      await PermissionService.enforcePermission(
        businessId,
        req.user!.id,
        req.user!.role,
        'INSIGHTS_MANAGE'
      );

      const result = await AutomatedInsightsService.dismissInsight(businessId, insightId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
