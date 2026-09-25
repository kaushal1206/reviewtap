import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SubscriptionService } from '../services/subscription.service.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { HTTP_STATUS } from '../constants/index.js';

const changePlanSchema = z.object({
  businessId: z.string().min(1, 'businessId is required').trim(),
  planCode: z.string().min(1, 'planCode is required').trim(),
});

const subscriptionActionSchema = z.object({
  businessId: z.string().min(1, 'businessId is required').trim(),
});

export class SubscriptionController {
  /**
   * Get subscription details, active plan, and real-time usage for a business
   * GET /api/subscription
   */
  static async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      let businessId = req.query.businessId as string | undefined;

      // If businessId is not specified in query, default to the user's first business
      if (!businessId) {
        const { businesses } = await BusinessRepository.findMany(
          { ownerId: req.user.role === 'SUPER_ADMIN' ? undefined : req.user.id },
          { limit: 1 }
        );

        if (businesses.length === 0) {
          res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            error: {
              code: 'NO_BUSINESS_FOUND',
              message: 'No business profiles found for this account. Create a business first.',
            },
          });
          return;
        }

        businessId = businesses[0].id;
      }

      const result = await SubscriptionService.getSubscription(businessId, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public/Authenticated listing of active plans
   * GET /api/subscription/plans
   */
  static async listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await SubscriptionService.listAvailablePlans();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { plans },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change plan workflow (Upgrade / Downgrade)
   * POST /api/subscription/change-plan
   */
  static async changePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { businessId, planCode } = changePlanSchema.parse(req.body);
      const result = await SubscriptionService.changePlan(businessId, planCode, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule cancellation at period end
   * POST /api/subscription/cancel
   */
  static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { businessId } = subscriptionActionSchema.parse(req.body);
      const result = await SubscriptionService.cancelSubscription(businessId, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate canceled subscription
   * POST /api/subscription/reactivate
   */
  static async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { businessId } = subscriptionActionSchema.parse(req.body);
      const result = await SubscriptionService.reactivateSubscription(businessId, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
