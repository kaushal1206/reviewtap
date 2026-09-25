import { useState, useEffect, useCallback } from 'react';
import { EventLog, PaginationMeta } from '../types';
import { EventService, EventQueryParams } from '../services/event.service';

export function useEvents(initialParams: EventQueryParams = {}) {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<EventQueryParams>(initialParams);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EventService.list(params);
      if (data) {
        setEvents(data.events);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const updateFilter = (newParams: Partial<EventQueryParams>) => {
    setParams((prev) => ({ ...prev, ...newParams, page: newParams.page ?? 1 }));
  };

  const setPage = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  return {
    events,
    pagination,
    isLoading,
    error,
    params,
    updateFilter,
    setPage,
    refresh: fetchEvents,
  };
}
