import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BillingService } from '../services/billing.service.js';
import { HTTP_STATUS } from '../constants/index.js';

const createOrderSchema = z.object({
  businessId: z.string().min(1, 'businessId is required').trim(),
  planCode: z.string().min(1, 'planCode is required').trim(),
  gateway: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const verifyPaymentSchema = z.object({
  orderReference: z.string().min(1, 'orderReference is required').trim(),
  gatewayPaymentId: z.string().optional(),
  signature: z.string().optional(),
});

const webhookSchema = z.object({
  provider: z.string().min(1).default('SIMULATED'),
  eventId: z.string().min(1, 'eventId is required'),
  eventType: z.string().min(1, 'eventType is required'),
  payload: z.any(),
  signature: z.string().optional(),
});

export class BillingController {
  /**
   * Create an authoritative payment order for subscription upgrade/purchase
   * POST /api/billing/orders
   */
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const validatedData = createOrderSchema.parse(req.body);
      const result = await BillingService.createPaymentOrder(validatedData, req.user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cryptographically verify a payment and activate/renew subscription
   * POST /api/billing/verify
   */
  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const validatedData = verifyPaymentSchema.parse(req.body);
      const result = await BillingService.verifyPayment(validatedData, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List invoices for a business or owner
   * GET /api/billing/invoices
   */
  static async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const businessId = req.query.businessId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await BillingService.listInvoices(businessId, req.user, { page, limit });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single invoice details
   * GET /api/billing/invoices/:id
   */
  static async getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!invoiceId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: { code: 'INVALID_INVOICE_ID', message: 'Invoice ID is required' },
        });
        return;
      }
      const result = await BillingService.getInvoice(invoiceId, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { invoice: result },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Idempotent webhook receiver
   * POST /api/billing/webhook
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawHeader = req.headers['x-webhook-signature'] || req.headers['stripe-signature'];
      const headerSignature = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
      const validatedData = webhookSchema.parse(req.body);

      const signature = validatedData.signature || headerSignature;
      const result = await BillingService.handleWebhook(
        validatedData.provider,
        validatedData.eventId,
        validatedData.eventType,
        validatedData.payload,
        signature
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
