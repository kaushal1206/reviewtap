import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NfcService } from '../services/nfc.service.js';
import { HTTP_STATUS } from '../constants/index.js';
import { NfcCardStatus } from '@prisma/client';

const createNfcCardSchema = z.object({
  label: z.string().trim().optional(),
  businessId: z.string().trim().optional(),
  nfcTagUid: z.string().trim().optional(),
  batchNumber: z.string().trim().optional(),
  activateImmediately: z.boolean().optional(),
});

const updateNfcCardSchema = z.object({
  label: z.string().trim().optional(),
  nfcTagUid: z.string().trim().optional(),
});

const assignNfcCardSchema = z.object({
  businessId: z.string().min(1, 'businessId is required').trim(),
});

export class NfcController {
  /**
   * Create an NFC card record (Single or pre-provisioned)
   * POST /api/nfc
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = createNfcCardSchema.parse(req.body);
      const result = await NfcService.createCard(input, req.user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all NFC cards accessible by the authenticated user
   * GET /api/nfc
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const query = {
        businessId: req.query.businessId as string | undefined,
        status: req.query.status as NfcCardStatus | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await NfcService.listCards(req.user, query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single NFC card by ID with telemetry breakdown
   * GET /api/nfc/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const result = await NfcService.getCardById(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update NFC card details
   * PATCH /api/nfc/:id
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const data = updateNfcCardSchema.parse(req.body);
      const result = await NfcService.updateCard(id, data, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign card to a business
   * POST /api/nfc/:id/assign
   */
  static async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const { businessId } = assignNfcCardSchema.parse(req.body);
      const result = await NfcService.assignCard(id, businessId, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unassign card from business
   * POST /api/nfc/:id/unassign
   */
  static async unassign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const result = await NfcService.unassignCard(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate card
   * POST /api/nfc/:id/activate
   */
  static async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const result = await NfcService.activateCard(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate card
   * POST /api/nfc/:id/deactivate
   */
  static async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const result = await NfcService.deactivateCard(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retire card (permanent)
   * POST /api/nfc/:id/retire
   */
  static async retire(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const result = await NfcService.retireCard(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download or stream backup QR code for this NFC card
   * GET /api/nfc/:id/qr
   */
  static async getQRCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const format = req.query.format === 'png' ? 'png' : 'svg';
      const download = req.query.download === 'true';

      const result = await NfcService.getQRCode(id, format, download);

      res.setHeader('Content-Type', result.type);
      if (download) {
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      }

      res.send(result.content);
    } catch (error) {
      next(error);
    }
  }
}
