import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BusinessService } from '../services/business.service.js';
import { HTTP_STATUS } from '../constants/index.js';
import { BusinessStatus } from '@prisma/client';

const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').trim(),
  googleReviewUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url) =>
        url.includes('google.com') ||
        url.includes('goo.gl') ||
        url.includes('g.page') ||
        url.includes('http'),
      {
        message: 'Must be a valid review destination URL',
      }
    ),
  googlePlaceId: z.string().optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  googleReviewUrl: z.string().url().optional(),
  googlePlaceId: z.string().optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  brandingSettings: z.any().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

export class BusinessController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const data = createBusinessSchema.parse(req.body);
      const result = await BusinessService.createBusiness(data, req.user.id);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Business created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const search = req.query.search as string | undefined;
      const status = req.query.status as BusinessStatus | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await BusinessService.listBusinesses(req.user, { search, status, page, limit });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const id = String(req.params.id);
      const result = await BusinessService.getBusinessById(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const id = String(req.params.id);
      const data = updateBusinessSchema.parse(req.body);
      const result = await BusinessService.updateBusiness(id, data, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Business updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const id = String(req.params.id);
      const { status } = updateStatusSchema.parse(req.body);
      const result = await BusinessService.updateStatus(id, status, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Business status updated to ${status}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const id = String(req.params.id);
      const result = await BusinessService.softDeleteBusiness(id, req.user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQRCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const format = (req.query.format as string) === 'png' ? 'png' : 'svg';
      const download = req.query.download === 'true';

      const result = await BusinessService.getQRCode(id, format, download);

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
