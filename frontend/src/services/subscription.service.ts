import { api } from '../api/client';
import {
  ApiResponse,
  Plan,
  Subscription,
  SubscriptionDetails,
  SubscriptionStatus,
} from '../types';

export class SubscriptionService {
  /**
   * Get subscription details, active plan, and live usage for a business
   */
  static async getSubscription(businessId?: string): Promise<SubscriptionDetails | undefined> {
    const res = await api.get<ApiResponse<SubscriptionDetails>>('/subscription', {
      params: businessId ? { businessId } : {},
    });
    return res.data.data;
  }

  /**
   * List publicly available pricing plans
   */
  static async listPlans(): Promise<Plan[]> {
    const res = await api.get<ApiResponse<{ plans: Plan[] }>>('/subscription/plans');
    return res.data.data?.plans || [];
  }

  /**
   * Change plan tier (Upgrade / Downgrade)
   */
  static async changePlan(businessId: string, planCode: string): Promise<any> {
    const res = await api.post<ApiResponse<{ subscription: Subscription; plan: Plan; message: string }>>(
      '/subscription/change-plan',
      { businessId, planCode }
    );
    return res.data.data;
  }

  /**
   * Schedule cancellation at period end
   */
  static async cancel(businessId: string): Promise<any> {
    const res = await api.post<ApiResponse<{ subscription: Subscription; message: string }>>(
      '/subscription/cancel',
      { businessId }
    );
    return res.data.data;
  }

  /**
   * Reactivate a subscription scheduled for cancellation
   */
  static async reactivate(businessId: string): Promise<any> {
    const res = await api.post<ApiResponse<{ subscription: Subscription; message: string }>>(
      '/subscription/reactivate',
      { businessId }
    );
    return res.data.data;
  }

  // ==========================================
  // SUPER ADMIN METHODS
  // ==========================================

  static async adminListPlans(): Promise<Plan[]> {
    const res = await api.get<ApiResponse<{ plans: Plan[] }>>('/admin/plans');
    return res.data.data?.plans || [];
  }

  static async adminCreatePlan(data: Partial<Plan>): Promise<Plan | undefined> {
    const res = await api.post<ApiResponse<{ plan: Plan }>>('/admin/plans', data);
    return res.data.data?.plan;
  }

  static async adminUpdatePlan(id: string, data: Partial<Plan>): Promise<Plan | undefined> {
    const res = await api.patch<ApiResponse<{ plan: Plan }>>(`/admin/plans/${id}`, data);
    return res.data.data?.plan;
  }

  static async adminListSubscriptions(params: {
    status?: SubscriptionStatus;
    planId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/admin/plans/subscriptions', { params });
    return res.data.data;
  }
}
