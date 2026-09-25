import crypto from 'crypto';
import { NfcCardStatus, Role } from '@prisma/client';
import { NfcRepository, NfcCardListFilter, PaginationOptions } from '../repositories/nfc.repository.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { QRService } from './qr.service.js';
import { EntitlementService } from './entitlement.service.js';
import { env } from '../config/env.js';

export interface CreateNfcCardInput {
  label?: string;
  businessId?: string;
  nfcTagUid?: string;
  batchNumber?: string;
  activateImmediately?: boolean;
}

export class NfcService {
  /**
   * Generates a stable, physical-label friendly public card identifier
   * Example: RT-NFC-8A2F1C
   */
  static generatePublicId(): string {
    const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `RT-NFC-${randomChars}`;
  }

  /**
   * Resolves the list of business IDs accessible by the user
   */
  private static async getPermittedBusinessIds(user: { id: string; role: Role }): Promise<string[] | undefined> {
    if (user.role === 'SUPER_ADMIN') {
      return undefined;
    }
    const { businesses } = await BusinessRepository.findMany({ ownerId: user.id }, { limit: 1000 });
    return businesses.map((b) => b.id);
  }

  static async createCard(input: CreateNfcCardInput, user: { id: string; role: Role }) {
    let initialStatus: NfcCardStatus = 'UNASSIGNED';
    let assignedBusinessId: string | null = null;
    let activatedAt: Date | null = null;

    if (input.businessId) {
      // Multi-tenant check: verify requesting user owns this business
      const business = await BusinessRepository.findById(input.businessId);
      if (!business) {
        const error: any = new Error('Business not found');
        error.statusCode = 404;
        throw error;
      }
      if (user.role !== 'SUPER_ADMIN' && business.ownerId !== user.id) {
        const error: any = new Error('Forbidden: You cannot assign an NFC card to a business you do not own');
        error.statusCode = 403;
        throw error;
      }

      // Check plan limit
      await EntitlementService.checkResourceLimit(input.businessId, 'NFC_CARD');

      assignedBusinessId = input.businessId;
      if (input.activateImmediately) {
        initialStatus = 'ACTIVE';
        activatedAt = new Date();
      } else {
        initialStatus = 'ASSIGNED';
      }
    }

    const publicId = this.generatePublicId();

    const card = await NfcRepository.create({
      publicId,
      label: input.label || `NFC Card ${publicId}`,
      status: initialStatus,
      nfcTagUid: input.nfcTagUid || null,
      batchNumber: input.batchNumber || null,
      activatedAt,
      ...(assignedBusinessId ? { business: { connect: { id: assignedBusinessId } } } : {}),
    });

    const nfcUrl = `${env.CLIENT_URL}/r/nfc/${card.publicId}`;

    return {
      card,
      nfcUrl,
    };
  }

  static async listCards(
    user: { id: string; role: Role },
    query: { businessId?: string; status?: NfcCardStatus; search?: string; page?: number; limit?: number }
  ) {
    const permittedBusinessIds = await this.getPermittedBusinessIds(user);

    // If business owner and specified businessId, verify ownership
    if (query.businessId && user.role !== 'SUPER_ADMIN') {
      if (!permittedBusinessIds?.includes(query.businessId)) {
        const error: any = new Error('Forbidden: You do not have permission to view cards for this business');
        error.statusCode = 403;
        throw error;
      }
    }

    const filter: NfcCardListFilter = {
      businessId: query.businessId,
      businessIds: permittedBusinessIds,
      status: query.status,
      search: query.search,
    };

    const pagination: PaginationOptions = {
      page: query.page || 1,
      limit: query.limit || 20,
    };

    const [{ cards, total }, counts] = await Promise.all([
      NfcRepository.findMany(filter, pagination),
      NfcRepository.countByFilter(filter),
    ]);

    const formatted = cards.map((c) => ({
      ...c,
      totalTaps: c._count?.scanEvents ?? 0,
      nfcUrl: `${env.CLIENT_URL}/r/nfc/${c.publicId}`,
    }));

    return {
      cards: formatted,
      counts,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 20)),
      },
    };
  }

  static async getCardById(id: string, user: { id: string; role: Role }) {
    const card = await NfcRepository.findById(id);

    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    // Multi-tenant authorization check
    if (user.role !== 'SUPER_ADMIN') {
      if (!card.business || card.business.ownerId !== user.id) {
        const error: any = new Error('Forbidden: You do not have permission to access this NFC card');
        error.statusCode = 403;
        throw error;
      }
    }

    const analytics = await NfcRepository.getCardAnalytics(card.id);
    const nfcUrl = `${env.CLIENT_URL}/r/nfc/${card.publicId}`;

    return {
      card: {
        ...card,
        totalTaps: card._count?.scanEvents ?? 0,
        analytics,
        nfcUrl,
      },
    };
  }

  static async assignCard(id: string, businessId: string, user: { id: string; role: Role }) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    if (card.status === 'RETIRED') {
      const error: any = new Error('Cannot assign a retired NFC card');
      error.statusCode = 400;
      throw error;
    }

    // Verify requesting user owns the target business
    const targetBusiness = await BusinessRepository.findById(businessId);
    if (!targetBusiness) {
      const error: any = new Error('Target business not found');
      error.statusCode = 404;
      throw error;
    }
    if (user.role !== 'SUPER_ADMIN' && targetBusiness.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You cannot assign an NFC card to another owner\'s business');
      error.statusCode = 403;
      throw error;
    }

    // If card was previously assigned to a different business and user is not Super Admin, verify ownership of previous business
    if (card.business && user.role !== 'SUPER_ADMIN' && card.business.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not own this NFC card');
      error.statusCode = 403;
      throw error;
    }

    // Check plan limit for target business
    await EntitlementService.checkResourceLimit(businessId, 'NFC_CARD');

    const updated = await NfcRepository.update(id, {
      business: { connect: { id: businessId } },
      status: card.status === 'UNASSIGNED' ? 'ASSIGNED' : card.status,
    });

    return { card: updated };
  }

  static async unassignCard(id: string, user: { id: string; role: Role }) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    if (card.status === 'RETIRED') {
      const error: any = new Error('Cannot modify a retired card');
      error.statusCode = 400;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && card.business && card.business.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not own this card');
      error.statusCode = 403;
      throw error;
    }

    const updated = await NfcRepository.update(id, {
      business: { disconnect: true },
      status: 'UNASSIGNED',
    });

    return { card: updated };
  }

  static async updateCard(
    id: string,
    data: { label?: string; nfcTagUid?: string },
    user: { id: string; role: Role }
  ) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    if (card.status === 'RETIRED') {
      const error: any = new Error('Cannot modify a retired card');
      error.statusCode = 400;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && card.business && card.business.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not own this card');
      error.statusCode = 403;
      throw error;
    }

    const updated = await NfcRepository.update(id, {
      ...(data.label ? { label: data.label } : {}),
      ...(data.nfcTagUid !== undefined ? { nfcTagUid: data.nfcTagUid } : {}),
    });

    return { card: updated };
  }

  static async activateCard(id: string, user: { id: string; role: Role }) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    if (card.status === 'RETIRED') {
      const error: any = new Error('Cannot activate a retired card');
      error.statusCode = 400;
      throw error;
    }

    if (!card.businessId) {
      const error: any = new Error('Cannot activate an unassigned card. Please assign it to a business first.');
      error.statusCode = 400;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && card.business?.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not own this card');
      error.statusCode = 403;
      throw error;
    }

    const updated = await NfcRepository.update(id, {
      status: 'ACTIVE',
      activatedAt: new Date(),
    });

    return { card: updated };
  }

  static async deactivateCard(id: string, user: { id: string; role: Role }) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    if (card.status === 'RETIRED') {
      const error: any = new Error('Card is retired and cannot be deactivated');
      error.statusCode = 400;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && card.business?.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not own this card');
      error.statusCode = 403;
      throw error;
    }

    const updated = await NfcRepository.update(id, {
      status: 'INACTIVE',
      deactivatedAt: new Date(),
    });

    return { card: updated };
  }

  static async retireCard(id: string, user: { id: string; role: Role }) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    if (card.status === 'RETIRED') {
      const error: any = new Error('Card is already retired');
      error.statusCode = 400;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && card.business && card.business.ownerId !== user.id) {
      const error: any = new Error('Forbidden: You do not own this card');
      error.statusCode = 403;
      throw error;
    }

    const updated = await NfcRepository.update(id, {
      status: 'RETIRED',
      retiredAt: new Date(),
    });

    return { card: updated };
  }

  static async getQRCode(id: string, format: 'svg' | 'png' = 'svg', download: boolean = false) {
    const card = await NfcRepository.findById(id);
    if (!card) {
      const error: any = new Error('NFC card not found');
      error.statusCode = 404;
      throw error;
    }

    const targetUrl = `${env.CLIENT_URL}/r/nfc/${card.publicId}`;

    if (format === 'png') {
      const buffer = await QRService.generatePNGBuffer(targetUrl, { width: 1024, margin: 3 });
      return {
        type: 'image/png',
        content: buffer,
        filename: `${card.publicId}-backup-qr.png`,
      };
    }

    const svg = await QRService.generateSVG(targetUrl);
    return {
      type: 'image/svg+xml',
      content: svg,
      filename: `${card.publicId}-backup-qr.svg`,
    };
  }
}
