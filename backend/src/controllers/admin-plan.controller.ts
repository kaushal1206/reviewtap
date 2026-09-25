import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SubscriptionService } from '../services/subscription.service.js';
import { HTTP_STATUS } from '../constants/index.js';
import { SubscriptionStatus } from '@prisma/client';

const createPlanSchema = z.object({
  code: z.string().min(2).max(20).trim(),
  name: z.string().min(2).max(50).trim(),
  description: z.string().trim().optional(),
  price: z.number().int().min(0),
  currency: z.string().default('USD'),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  maxBusinesses: z.number().int().min(1).default(1),
  maxQrSources: z.number().int().min(1).default(1),
  maxNfcCards: z.number().int().min(0).default(1),
  maxMonthlyEvents: z.number().int().min(100).default(500),
  analyticsRetentionDays: z.number().int().min(1).default(14),
  customBranding: z.boolean().default(false),
  exportAnalytics: z.boolean().default(false),
  prioritySupport: z.boolean().default(false),
});

const updatePlanSchema = z.object({
  name: z.string().min(2).max(50).trim().optional(),
  description: z.string().trim().optional(),
  price: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  maxBusinesses: z.number().int().min(1).optional(),
  maxQrSources: z.number().int().min(1).optional(),
  maxNfcCards: z.number().int().min(0).optional(),
  maxMonthlyEvents: z.number().int().min(100).optional(),
  analyticsRetentionDays: z.number().int().min(1).optional(),
  customBranding: z.boolean().optional(),
  exportAnalytics: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
});

export class AdminPlanController {
  /**
   * List all system plans (active and inactive)
   * GET /api/admin/plans
   */
  static async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const plans = await SubscriptionService.listAllPlans(req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { plans },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new pricing tier
   * POST /api/admin/plans
   */
  static async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = createPlanSchema.parse(req.body);
      const plan = await SubscriptionService.createPlan(input, req.user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update plan limits or pricing
   * PATCH /api/admin/plans/:id
   */
  static async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const input = updatePlanSchema.parse(req.body);
      const plan = await SubscriptionService.updatePlan(id, input, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Overview of subscriptions across all tenants
   * GET /api/admin/subscriptions
   */
  static async listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const query = {
        status: req.query.status as SubscriptionStatus | undefined,
        planId: req.query.planId as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await SubscriptionService.listAllSubscriptions(query, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
