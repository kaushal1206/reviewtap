import { api } from '../api/client';
import { ApiResponse, Business, BusinessCounts, BusinessStatus, PaginationMeta } from '../types';

export interface BusinessListParams {
  search?: string;
  status?: BusinessStatus;
  page?: number;
  limit?: number;
}

export interface CreateBusinessDto {
  name: string;
  googleReviewUrl: string;
  googlePlaceId?: string;
  category?: string;
  phone?: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  logoUrl?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  googleReviewUrl?: string;
  googlePlaceId?: string;
  category?: string;
  phone?: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  logoUrl?: string;
  brandingSettings?: any;
}

export class BusinessService {
  static async list(params: BusinessListParams = {}) {
    const res = await api.get<ApiResponse<{ businesses: Business[]; counts: BusinessCounts; pagination: PaginationMeta }>>(
      '/businesses',
      { params }
    );
    return res.data.data;
  }

  static async getById(id: string) {
    const res = await api.get<ApiResponse<{ business: Business }>>(`/businesses/${id}`);
    return res.data.data?.business;
  }

  static async create(dto: CreateBusinessDto) {
    const res = await api.post<ApiResponse<{ business: Business; publicReviewUrl: string }>>('/businesses', dto);
    return res.data.data;
  }

  static async update(id: string, dto: UpdateBusinessDto) {
    const res = await api.patch<ApiResponse<{ business: Business }>>(`/businesses/${id}`, dto);
    return res.data.data?.business;
  }

  static async updateStatus(id: string, status: BusinessStatus) {
    const res = await api.patch<ApiResponse<{ business: Business }>>(`/businesses/${id}/status`, { status });
    return res.data.data?.business;
  }

  static async delete(id: string) {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/businesses/${id}`);
    return res.data;
  }
}
