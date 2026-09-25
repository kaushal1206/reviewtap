import { api } from '../api/client';
import { ApiResponse } from '../types';

export interface BusinessUsageDetails {
  subscription: any;
  plan: any;
  usage: {
    activeQrSources: number;
    activeNfcCards: number;
    monthlyTotalEvents: number;
    monthlyRedirectEvents: number;
    activeTeamMembers: number;
    pendingInvitations: number;
    totalCommittedSeats: number;
  };
  limits: {
    maxQrSources: number;
    maxNfcCards: number;
    maxMonthlyEvents: number;
    maxTeamMembers: number;
    analyticsRetentionDays: number;
    customBranding: boolean;
    exportAnalytics: boolean;
    prioritySupport: boolean;
  };
  remaining: {
    qrSources: number;
    nfcCards: number;
    monthlyEvents: number;
    teamMembers: number;
  };
  isLimitReached: {
    qrSources: boolean;
    nfcCards: boolean;
    monthlyEvents: boolean;
    teamMembers: boolean;
  };
}

export const usageService = {
  getUsage: async (businessId: string): Promise<BusinessUsageDetails> => {
    const response = await api.get<ApiResponse<BusinessUsageDetails>>(`/usage/${businessId}`);
    return response.data.data!;
  },
};
