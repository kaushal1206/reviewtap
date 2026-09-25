import { useState, useEffect, useCallback } from 'react';
import { AnalyticsOverview } from '../types';
import { AnalyticsService } from '../services/analytics.service';

export function useAnalytics(businessId?: string) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await AnalyticsService.getOverview(businessId);
      if (data) {
        setOverview(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    overview,
    isLoading,
    error,
    refresh: fetchOverview,
  };
}
