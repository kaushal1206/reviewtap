import { useState, useEffect, useCallback } from 'react';
import { Business, BusinessCounts, BusinessStatus, PaginationMeta } from '../types';
import { BusinessService, BusinessListParams } from '../services/business.service';

export function useBusinesses(initialParams: BusinessListParams = {}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [counts, setCounts] = useState<BusinessCounts>({ total: 0, active: 0, inactive: 0, archived: 0 });
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<BusinessListParams>(initialParams);

  const fetchBusinesses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await BusinessService.list(params);
      if (data) {
        setBusinesses(data.businesses);
        setCounts(data.counts);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch businesses');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const updateFilter = (newParams: Partial<BusinessListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams, page: newParams.page ?? 1 }));
  };

  const updateStatus = async (id: string, status: BusinessStatus) => {
    try {
      const updated = await BusinessService.updateStatus(id, status);
      if (updated) {
        setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, status: updated.status, isActive: updated.isActive } : b)));
        fetchBusinesses(); // Refresh counts
      }
      return updated;
    } catch (err: any) {
      throw new Error(err?.response?.data?.error?.message || err?.message || 'Failed to update status');
    }
  };

  return {
    businesses,
    counts,
    pagination,
    isLoading,
    error,
    params,
    updateFilter,
    updateStatus,
    refresh: fetchBusinesses,
  };
}
