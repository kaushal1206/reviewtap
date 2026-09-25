import { api, getApiAssetUrl } from '../api/client';
import { ApiResponse, NfcCard, NfcCardCounts, NfcCardStatus, PaginationMeta, CreateNfcCardDto, UpdateNfcCardDto } from '../types';

export interface NfcListParams {
  businessId?: string;
  status?: NfcCardStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class NfcService {
  static async list(params: NfcListParams = {}) {
    const res = await api.get<ApiResponse<{ cards: NfcCard[]; counts: NfcCardCounts; pagination: PaginationMeta }>>(
      '/nfc',
      { params }
    );
    return res.data.data;
  }

  static async getById(id: string) {
    const res = await api.get<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}`);
    return res.data.data?.card;
  }

  static async create(dto: CreateNfcCardDto) {
    const res = await api.post<ApiResponse<{ card: NfcCard; nfcUrl: string }>>('/nfc', dto);
    return res.data.data;
  }

  static async update(id: string, dto: UpdateNfcCardDto) {
    const res = await api.patch<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}`, dto);
    return res.data.data?.card;
  }

  static async assign(id: string, businessId: string) {
    const res = await api.post<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}/assign`, { businessId });
    return res.data.data?.card;
  }

  static async unassign(id: string) {
    const res = await api.post<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}/unassign`);
    return res.data.data?.card;
  }

  static async activate(id: string) {
    const res = await api.post<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}/activate`);
    return res.data.data?.card;
  }

  static async deactivate(id: string) {
    const res = await api.post<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}/deactivate`);
    return res.data.data?.card;
  }

  static async retire(id: string) {
    const res = await api.post<ApiResponse<{ card: NfcCard }>>(`/nfc/${id}/retire`);
    return res.data.data?.card;
  }

  static getQrCodeUrl(id: string, format: 'svg' | 'png' = 'svg', download: boolean = false) {
    return getApiAssetUrl(`/api/nfc/${id}/qr?format=${format}&download=${download}`);
  }
}
