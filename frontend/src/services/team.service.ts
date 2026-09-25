import { api } from '../api/client';
import { ApiResponse, TeamMember, Invitation, TeamRole } from '../types';

export class TeamService {
  static async listMembers(businessId: string) {
    const res = await api.get<ApiResponse<{ members: TeamMember[] }>>(
      `/businesses/${businessId}/team`
    );
    return res.data.data?.members || [];
  }

  static async updateMemberRole(businessId: string, userId: string, role: TeamRole) {
    const res = await api.patch<ApiResponse<{ member: TeamMember }>>(
      `/businesses/${businessId}/team/${userId}/role`,
      { role }
    );
    return res.data.data?.member;
  }

  static async removeMember(businessId: string, userId: string) {
    const res = await api.delete<ApiResponse<{ message: string }>>(
      `/businesses/${businessId}/team/${userId}`
    );
    return res.data;
  }

  static async inviteMember(businessId: string, email: string, role: TeamRole) {
    const res = await api.post<ApiResponse<{ invitation: Invitation; inviteLink: string }>>(
      `/businesses/${businessId}/invitations`,
      { email, role }
    );
    return res.data.data;
  }

  static async listInvitations(businessId: string) {
    const res = await api.get<ApiResponse<{ invitations: Invitation[] }>>(
      `/businesses/${businessId}/invitations`
    );
    return res.data.data?.invitations || [];
  }

  static async revokeInvitation(businessId: string, invitationId: string) {
    const res = await api.delete<ApiResponse<{ message: string }>>(
      `/businesses/${businessId}/invitations/${invitationId}`
    );
    return res.data;
  }

  static async getInvitationPreview(token: string) {
    const res = await api.get<ApiResponse<{ invitation: Invitation }>>(
      `/invitations/preview/${token}`
    );
    return res.data.data?.invitation;
  }

  static async acceptInvitation(token: string) {
    const res = await api.post<ApiResponse<{ message: string; business: any; role: TeamRole }>>(
      '/invitations/accept',
      { token }
    );
    return res.data.data;
  }
}
