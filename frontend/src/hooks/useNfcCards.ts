import { useState, useEffect, useCallback } from 'react';
import { NfcCard, NfcCardCounts, PaginationMeta } from '../types';
import { NfcService, NfcListParams } from '../services/nfc.service';

export function useNfcCards(initialParams: NfcListParams = {}) {
  const [cards, setCards] = useState<NfcCard[]>([]);
  const [counts, setCounts] = useState<NfcCardCounts>({
    total: 0,
    unassigned: 0,
    assigned: 0,
    active: 0,
    inactive: 0,
    retired: 0,
  });
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<NfcListParams>(initialParams);

  const fetchCards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await NfcService.list(params);
      if (data) {
        setCards(data.cards);
        setCounts(data.counts);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch NFC cards');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const updateFilter = (newParams: Partial<NfcListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams, page: newParams.page ?? 1 }));
  };

  const activate = async (id: string) => {
    const updated = await NfcService.activate(id);
    if (updated) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c)));
      fetchCards();
    }
    return updated;
  };

  const deactivate = async (id: string) => {
    const updated = await NfcService.deactivate(id);
    if (updated) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c)));
      fetchCards();
    }
    return updated;
  };

  const retire = async (id: string) => {
    const updated = await NfcService.retire(id);
    if (updated) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c)));
      fetchCards();
    }
    return updated;
  };

  const assign = async (id: string, businessId: string) => {
    const updated = await NfcService.assign(id, businessId);
    if (updated) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      fetchCards();
    }
    return updated;
  };

  const unassign = async (id: string) => {
    const updated = await NfcService.unassign(id);
    if (updated) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      fetchCards();
    }
    return updated;
  };

  return {
    cards,
    counts,
    pagination,
    isLoading,
    error,
    params,
    updateFilter,
    activate,
    deactivate,
    retire,
    assign,
    unassign,
    refresh: fetchCards,
  };
}
