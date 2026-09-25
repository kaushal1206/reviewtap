import { api } from '../api/client';
import {
  ApiResponse,
  PaymentOrder,
  BillingInvoice,
  InvoicesResponse,
  Subscription,
  Plan,
} from '../types';

export class BillingService {
  /**
   * Create an authoritative payment order for a plan
   */
  static async createOrder(businessId: string, planCode: string): Promise<{ order: PaymentOrder; message: string }> {
    const res = await api.post<ApiResponse<{ order: PaymentOrder; message: string }>>('/billing/orders', {
      businessId,
      planCode,
    });
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create payment order');
    }
    return res.data.data;
  }

  /**
   * Cryptographically verify payment and activate subscription
   */
  static async verifyPayment(
    orderReference: string,
    signature?: string,
    gatewayPaymentId?: string
  ): Promise<{ order: PaymentOrder; subscription: Subscription; plan: Plan; invoice: BillingInvoice; message: string }> {
    const res = await api.post<
      ApiResponse<{ order: PaymentOrder; subscription: Subscription; plan: Plan; invoice: BillingInvoice; message: string }>
    >('/billing/verify', {
      orderReference,
      signature,
      gatewayPaymentId,
    });
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Payment verification failed');
    }
    return res.data.data;
  }

  /**
   * List invoices for a business or owner
   */
  static async listInvoices(businessId?: string, page = 1, limit = 20): Promise<InvoicesResponse> {
    const res = await api.get<ApiResponse<InvoicesResponse>>('/billing/invoices', {
      params: {
        ...(businessId ? { businessId } : {}),
        page,
        limit,
      },
    });
    return (
      res.data.data || {
        invoices: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }
    );
  }

  /**
   * Get single invoice details
   */
  static async getInvoice(id: string): Promise<BillingInvoice | undefined> {
    const res = await api.get<ApiResponse<{ invoice: BillingInvoice }>>(`/billing/invoices/${id}`);
    return res.data.data?.invoice;
  }
}
