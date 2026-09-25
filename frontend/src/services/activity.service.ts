import { api } from '../api/client';
import { ApiResponse, ActivityLog, PaginationMeta } from '../types';

export class ActivityService {
  static async getTimeline(
    businessId: string,
    params: { page?: number; limit?: number; action?: string } = {}
  ) {
    const res = await api.get<
      ApiResponse<{
        activities: ActivityLog[];
        pagination: PaginationMeta;
      }>
    >(`/businesses/${businessId}/activity`, { params });
    return res.data.data;
  }
}
