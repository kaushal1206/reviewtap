import { useState, useEffect, useCallback } from 'react';
import { Plan, SubscriptionDetails } from '../types';
import { SubscriptionService } from '../services/subscription.service';

export function useSubscription(businessId?: string) {
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [subData, plansData] = await Promise.all([
        SubscriptionService.getSubscription(businessId),
        SubscriptionService.listPlans(),
      ]);

      if (subData) {
        setDetails(subData);
      }
      if (plansData) {
        setPlans(plansData);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load subscription details');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const changePlan = async (targetPlanCode: string) => {
    if (!details?.subscription.businessId) return;
    const res = await SubscriptionService.changePlan(details.subscription.businessId, targetPlanCode);
    await fetchSubscription();
    return res;
  };

  const cancel = async () => {
    if (!details?.subscription.businessId) return;
    const res = await SubscriptionService.cancel(details.subscription.businessId);
    await fetchSubscription();
    return res;
  };

  const reactivate = async () => {
    if (!details?.subscription.businessId) return;
    const res = await SubscriptionService.reactivate(details.subscription.businessId);
    await fetchSubscription();
    return res;
  };

  return {
    details,
    plans,
    isLoading,
    error,
    refresh: fetchSubscription,
    changePlan,
    cancel,
    reactivate,
  };
}
