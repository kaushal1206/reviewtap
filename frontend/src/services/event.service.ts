import { api } from '../api/client';
import { ApiResponse, EventLog, PaginationMeta, ScanSourceType } from '../types';

export interface EventQueryParams {
  businessId?: string;
  sourceType?: ScanSourceType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class EventService {
  static async list(params: EventQueryParams = {}) {
    const res = await api.get<ApiResponse<{ events: EventLog[]; pagination: PaginationMeta }>>('/events', {
      params,
    });
    return res.data.data;
  }
}
