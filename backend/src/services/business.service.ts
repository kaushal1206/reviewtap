import { BusinessStatus, Role, User } from '@prisma/client';
import { BusinessRepository, BusinessListFilter, PaginationOptions } from '../repositories/business.repository.js';
import { PlanRepository } from '../repositories/plan.repository.js';
import { EntitlementService } from './entitlement.service.js';
import { PermissionService } from './permission.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { generateSlug } from '../utils/slug.js';
import { QRService } from './qr.service.js';
import { env } from '../config/env.js';

export interface CreateBusinessInput {
  name: string;
  googleReviewUrl: string;
  googlePlaceId?: string;
  category?: string;
  phone?: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  logoUrl?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  googleReviewUrl?: string;
  googlePlaceId?: string;
  category?: string;
  phone?: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  logoUrl?: string;
  brandingSettings?: any;
}

export class BusinessService {
  static async createBusiness(input: CreateBusinessInput, ownerId: string) {
    // 1. Enforce owner business quota limit
    await EntitlementService.checkOwnerBusinessLimit(ownerId);

    const slug = generateSlug(input.name);
    const defaultPlan = await PlanRepository.findDefault();
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const business = await BusinessRepository.create({
      name: input.name,
      slug,
      googleReviewUrl: input.googleReviewUrl,
      googlePlaceId: input.googlePlaceId || null,
      category: input.category || null,
      phone: input.phone || null,
      address: input.address || null,
      website: input.website || null,
      whatsapp: input.whatsapp || null,
      instagram: input.instagram || null,
      logoUrl: input.logoUrl || null,
      owner: { connect: { id: ownerId } },
      tapSources: {
        create: {
          shortCode: slug,
          type: 'QR_CODE',
          label: 'Default QR Stand',
        },
      },
      ...(defaultPlan
        ? {
            subscription: {
              create: {
                planId: defaultPlan.id,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: thirtyDaysLater,
              },
            },
          }
        : {}),
    });

    await ActivityLogService.log({
      businessId: business.id,
      userId: ownerId,
      action: 'BUSINESS_CREATED',
      entityType: 'BUSINESS',
      entityId: business.id,
      details: { name: business.name, slug: business.slug },
    });

    return {
      business,
      publicReviewUrl: `${env.CLIENT_URL}/r/${business.slug}`,
    };
  }

  static async listBusinesses(user: { id: string; role: Role }, query: { search?: string; status?: BusinessStatus; page?: number; limit?: number }) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    const filter: BusinessListFilter = {
      ...(isSuperAdmin ? {} : { memberUserId: user.id }),
      status: query.status,
      search: query.search,
    };

    const pagination: PaginationOptions = {
      page: query.page || 1,
      limit: query.limit || 50,
    };

    const { businesses, total } = await BusinessRepository.findMany(filter, pagination);

    const counts = await BusinessRepository.countByOwner(isSuperAdmin ? undefined : user.id);

    const formatted = businesses.map((b) => ({
      ...b,
      totalScans: b._count?.scanEvents ?? 0,
      publicReviewUrl: `${env.CLIENT_URL}/r/${b.slug}`,
    }));

    return {
      businesses: formatted,
      counts,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 50,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 50)),
      },
    };
  }

  static async getBusinessById(id: string, user: { id: string; role: Role }) {
    // Centralized capability check: BUSINESS_VIEW
    await PermissionService.enforcePermission(id, user.id, user.role, 'BUSINESS_VIEW');

    const business = await BusinessRepository.findById(id);

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      business: {
        ...business,
        totalScans: business._count?.scanEvents ?? 0,
        publicReviewUrl: `${env.CLIENT_URL}/r/${business.slug}`,
      },
    };
  }

  static async updateBusiness(id: string, input: UpdateBusinessInput, user: { id: string; role: Role }) {
    // Centralized capability check: BUSINESS_UPDATE
    await PermissionService.enforcePermission(id, user.id, user.role, 'BUSINESS_UPDATE');

    const business = await BusinessRepository.findById(id);

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    // Notice: We strictly preserve the existing slug in compliance with Rule 10 (Slug Stability)
    const updated = await BusinessRepository.update(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.googleReviewUrl ? { googleReviewUrl: input.googleReviewUrl } : {}),
      ...(input.googlePlaceId !== undefined ? { googlePlaceId: input.googlePlaceId } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
      ...(input.instagram !== undefined ? { instagram: input.instagram } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.brandingSettings !== undefined ? { brandingSettings: input.brandingSettings } : {}),
    });

    await ActivityLogService.log({
      businessId: id,
      userId: user.id,
      action: 'BUSINESS_UPDATED',
      entityType: 'BUSINESS',
      entityId: id,
    });

    return {
      business: {
        ...updated,
        publicReviewUrl: `${env.CLIENT_URL}/r/${updated.slug}`,
      },
    };
  }

  static async updateStatus(id: string, status: BusinessStatus, user: { id: string; role: Role }) {
    // Centralized capability check: BUSINESS_UPDATE
    await PermissionService.enforcePermission(id, user.id, user.role, 'BUSINESS_UPDATE');

    const business = await BusinessRepository.findById(id);

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    const updated = await BusinessRepository.updateStatus(id, status);

    await ActivityLogService.log({
      businessId: id,
      userId: user.id,
      action: 'BUSINESS_STATUS_CHANGED',
      entityType: 'BUSINESS',
      entityId: id,
      details: { newStatus: status },
    });

    return {
      business: updated,
    };
  }

  static async softDeleteBusiness(id: string, user: { id: string; role: Role }) {
    // Centralized capability check: BUSINESS_DELETE (strictly OWNER or SUPER_ADMIN)
    await PermissionService.enforcePermission(id, user.id, user.role, 'BUSINESS_DELETE');

    const business = await BusinessRepository.findById(id);

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    await BusinessRepository.softDelete(id);

    await ActivityLogService.log({
      businessId: id,
      userId: user.id,
      action: 'BUSINESS_ARCHIVED',
      entityType: 'BUSINESS',
      entityId: id,
    });

    return {
      message: 'Business archived successfully',
    };
  }

  static async getQRCode(id: string, format: 'svg' | 'png' = 'svg', download: boolean = false) {
    const business = await BusinessRepository.findById(id);

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    const targetUrl = `${env.CLIENT_URL}/r/${business.slug}`;

    if (format === 'png') {
      const buffer = await QRService.generatePNGBuffer(targetUrl, { width: 1024, margin: 3 });
      return {
        type: 'image/png',
        content: buffer,
        filename: `${business.slug}-reviewtap-qr.png`,
      };
    }

    const svg = await QRService.generateSVG(targetUrl);
    return {
      type: 'image/svg+xml',
      content: svg,
      filename: `${business.slug}-reviewtap-qr.svg`,
    };
  }
}
