import { api } from '../api/client';
import { ApiResponse, PlatformOverview, PaginationMeta } from '../types';

export interface AdminBusinessSearchItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  owner: { id: string; fullName: string; email: string };
  plan: string;
  planCode: string;
  subscriptionStatus: string;
  totalScans: number;
  totalNfcCards: number;
  totalTeamMembers: number;
  createdAt: string;
}

export class AdminService {
  static async getOverview() {
    const res = await api.get<ApiResponse<PlatformOverview>>('/admin/overview');
    return res.data.data;
  }

  static async searchBusinesses(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const res = await api.get<
      ApiResponse<{
        businesses: AdminBusinessSearchItem[];
        pagination: PaginationMeta;
      }>
    >('/admin/businesses', { params });
    return res.data.data;
  }
}
