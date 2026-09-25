import { api } from '../api/client';
import { ApiResponse, Notification, NotificationStatus, PaginationMeta } from '../types';

export interface NotificationListParams {
  status?: NotificationStatus;
  page?: number;
  limit?: number;
}

export class NotificationService {
  static async list(params: NotificationListParams = {}) {
    const res = await api.get<
      ApiResponse<{
        notifications: Notification[];
        unreadCount: number;
        pagination: PaginationMeta;
      }>
    >('/notifications', { params });
    return res.data.data;
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get<
        ApiResponse<{
          notifications: Notification[];
          unreadCount: number;
          pagination: PaginationMeta;
        }>
      >('/notifications', { params: { limit: 1 } });
      return res.data.data?.unreadCount || 0;
    } catch {
      return 0;
    }
  }

  static async markRead(id: string) {
    const res = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return res.data.data;
  }

  static async markAllRead() {
    const res = await api.patch<ApiResponse<{ updatedCount: number }>>('/notifications/read-all');
    return res.data.data;
  }

  static async archive(id: string) {
    const res = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/archive`);
    return res.data.data;
  }
}
