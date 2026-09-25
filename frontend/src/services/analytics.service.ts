import { api } from '../api/client';
import { ApiResponse, AnalyticsOverview, DailyTrendPoint, SourceDistribution } from '../types';

export class AnalyticsService {
  static async getOverview(businessId?: string) {
    const res = await api.get<ApiResponse<AnalyticsOverview>>('/analytics/overview', {
      params: businessId ? { businessId } : {},
    });
    return res.data.data;
  }

  static async getTrends(days: number = 14, businessId?: string) {
    const res = await api.get<ApiResponse<{ trends: DailyTrendPoint[] }>>('/analytics/trends', {
      params: { days, ...(businessId ? { businessId } : {}) },
    });
    return res.data.data?.trends || [];
  }

  static async getDistribution(businessId?: string) {
    const res = await api.get<ApiResponse<{ distribution: SourceDistribution }>>('/analytics/distribution', {
      params: businessId ? { businessId } : {},
    });
    return res.data.data?.distribution;
  }
}
