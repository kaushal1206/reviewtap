import { Prisma, PaymentOrder, BillingInvoice, PaymentOrderStatus, InvoiceStatus, WebhookStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class BillingRepository {
  // ==========================================
  // PAYMENT ORDERS
  // ==========================================

  static async createPaymentOrder(data: {
    businessId: string;
    planId: string;
    amount: number;
    currency?: string;
    orderReference: string;
    gateway?: string;
    gatewayOrderId?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<PaymentOrder> {
    return prisma.paymentOrder.create({
      data: {
        businessId: data.businessId,
        planId: data.planId,
        amount: data.amount,
        currency: data.currency || 'USD',
        orderReference: data.orderReference,
        gateway: data.gateway || 'SIMULATED',
        gatewayOrderId: data.gatewayOrderId,
        metadata: data.metadata,
        status: PaymentOrderStatus.PENDING,
      },
      include: {
        plan: true,
        business: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
      },
    });
  }

  static async findPaymentOrderByReference(orderReference: string) {
    return prisma.paymentOrder.findUnique({
      where: { orderReference },
      include: {
        plan: true,
        business: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
      },
    });
  }

  static async findPaymentOrderById(id: string) {
    return prisma.paymentOrder.findUnique({
      where: { id },
      include: {
        plan: true,
        business: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
      },
    });
  }

  static async updatePaymentOrder(
    id: string,
    data: {
      status?: PaymentOrderStatus;
      signature?: string;
      gatewayPaymentId?: string;
      completedAt?: Date;
      metadata?: Prisma.InputJsonValue;
    }
  ): Promise<PaymentOrder> {
    return prisma.paymentOrder.update({
      where: { id },
      data,
      include: {
        plan: true,
        business: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
      },
    });
  }

  // ==========================================
  // BILLING INVOICES
  // ==========================================

  static async createInvoice(data: {
    invoiceNumber: string;
    businessId: string;
    subscriptionId: string;
    paymentOrderId?: string;
    planCode: string;
    planName: string;
    amount: number;
    currency?: string;
    status?: InvoiceStatus;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    paidAt?: Date;
    pdfReceiptUrl?: string;
  }): Promise<BillingInvoice> {
    return prisma.billingInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        businessId: data.businessId,
        subscriptionId: data.subscriptionId,
        paymentOrderId: data.paymentOrderId,
        planCode: data.planCode,
        planName: data.planName,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: data.status || InvoiceStatus.PAID,
        billingPeriodStart: data.billingPeriodStart,
        billingPeriodEnd: data.billingPeriodEnd,
        paidAt: data.paidAt || new Date(),
        pdfReceiptUrl: data.pdfReceiptUrl,
      },
      include: {
        business: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
        paymentOrder: true,
      },
    });
  }

  static async findInvoiceById(id: string) {
    return prisma.billingInvoice.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
        paymentOrder: true,
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  static async findInvoicesByBusiness(businessId: string, pagination: PaginationOptions = {}) {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.billingInvoice.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          paymentOrder: {
            select: { id: true, orderReference: true, gateway: true, status: true },
          },
        },
      }),
      prisma.billingInvoice.count({ where: { businessId } }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async findInvoicesByOwner(ownerId: string, pagination: PaginationOptions = {}) {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BillingInvoiceWhereInput = {
      business: { ownerId },
    };

    const [invoices, total] = await Promise.all([
      prisma.billingInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          business: {
            select: { id: true, name: true, slug: true },
          },
          paymentOrder: {
            select: { id: true, orderReference: true, gateway: true, status: true },
          },
        },
      }),
      prisma.billingInvoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // WEBHOOK EVENTS (IDEMPOTENCY & AUDIT)
  // ==========================================

  static async findWebhookEvent(provider: string, eventId: string) {
    return prisma.webhookEvent.findUnique({
      where: {
        eventId,
      },
    });
  }

  static async recordWebhookEvent(data: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
    status?: WebhookStatus;
    error?: string;
  }) {
    return prisma.webhookEvent.create({
      data: {
        provider: data.provider,
        eventId: data.eventId,
        eventType: data.eventType,
        payload: data.payload,
        status: data.status || WebhookStatus.PROCESSED,
        error: data.error,
      },
    });
  }
}
