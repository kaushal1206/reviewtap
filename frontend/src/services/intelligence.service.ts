import { api } from '../api/client';
import { ApiResponse, ReviewIntelligence, BusinessHealth, BusinessInsight } from '../types';

export class IntelligenceService {
  static async getIntelligence(businessId: string) {
    const res = await api.get<ApiResponse<ReviewIntelligence>>(
      `/businesses/${businessId}/intelligence`
    );
    return res.data.data;
  }

  static async getHealth(businessId: string) {
    const res = await api.get<ApiResponse<BusinessHealth>>(`/businesses/${businessId}/health`);
    return res.data.data;
  }

  static async getInsights(businessId: string) {
    const res = await api.get<ApiResponse<{ insights: BusinessInsight[] }>>(
      `/businesses/${businessId}/insights`
    );
    return res.data.data?.insights || [];
  }

  static async dismissInsight(businessId: string, insightId: string) {
    const res = await api.patch<ApiResponse<{ isDismissed: boolean }>>(
      `/businesses/${businessId}/insights/${insightId}/dismiss`
    );
    return res.data.data;
  }
}
