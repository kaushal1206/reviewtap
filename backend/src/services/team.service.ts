import { Role, TeamRole } from '@prisma/client';
import { prisma } from '../config/db.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { PermissionService } from './permission.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { NotificationService } from './notification.service.js';

export class TeamService {
  /**
   * Lists all team members for a business including the owner
   */
  static async listTeamMembers(businessId: string, actor: { id: string; role: Role }) {
    await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_VIEW');

    const members = await TeamRepository.listMembers(businessId);
    if (!members) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    return { members };
  }

  /**
   * Updates a team member's role (MANAGER or STAFF)
   */
  static async updateMemberRole(
    businessId: string,
    targetUserId: string,
    newRole: TeamRole,
    actor: { id: string; role: Role }
  ) {
    await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_MANAGE');

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    if (business.ownerId === targetUserId) {
      const error: any = new Error('Forbidden: The primary business owner role cannot be modified');
      error.statusCode = 403;
      throw error;
    }

    if (actor.role !== 'SUPER_ADMIN' && actor.id === targetUserId) {
      const error: any = new Error('Forbidden: You cannot modify your own team role');
      error.statusCode = 403;
      throw error;
    }

    if (newRole === 'OWNER') {
      const error: any = new Error(
        'Forbidden: Cannot assign OWNER role via team management. Business ownership is immutable.'
      );
      error.statusCode = 403;
      throw error;
    }

    const currentMember = await TeamRepository.findMember(businessId, targetUserId);
    if (!currentMember) {
      const error: any = new Error('Team member not found in this business');
      error.statusCode = 404;
      throw error;
    }

    const oldRole = currentMember.role;
    const updated = await TeamRepository.updateMemberRole(businessId, targetUserId, newRole);

    // Audit log
    await ActivityLogService.log({
      businessId,
      userId: actor.id,
      action: 'ROLE_UPDATED',
      entityType: 'TEAM_MEMBER',
      entityId: updated.id,
      details: {
        targetUserId,
        targetEmail: updated.user.email,
        oldRole,
        newRole,
      },
    });

    // Notify member
    await NotificationService.create({
      userId: targetUserId,
      businessId,
      type: 'TEAM',
      title: 'Team Role Updated',
      message: `Your role in "${business.name}" has been updated from ${oldRole} to ${newRole}.`,
      metadata: { businessId, oldRole, newRole },
    });

    return { member: updated };
  }

  /**
   * Removes a team member from a business
   */
  static async removeMember(
    businessId: string,
    targetUserId: string,
    actor: { id: string; role: Role }
  ) {
    const isSelfLeaving = actor.id === targetUserId;

    if (!isSelfLeaving) {
      await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_MANAGE');
    } else {
      await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_VIEW');
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    if (business.ownerId === targetUserId) {
      const error: any = new Error('Forbidden: The primary business owner cannot be removed from the team');
      error.statusCode = 403;
      throw error;
    }

    const currentMember = await TeamRepository.findMember(businessId, targetUserId);
    if (!currentMember) {
      const error: any = new Error('Team member not found');
      error.statusCode = 404;
      throw error;
    }

    await TeamRepository.removeMember(businessId, targetUserId);

    // Audit log
    await ActivityLogService.log({
      businessId,
      userId: actor.id,
      action: isSelfLeaving ? 'MEMBER_LEFT' : 'MEMBER_REMOVED',
      entityType: 'TEAM_MEMBER',
      entityId: currentMember.id,
      details: {
        removedUserId: targetUserId,
        removedEmail: currentMember.user.email,
        removedRole: currentMember.role,
        isSelfLeaving,
      },
    });

    // Notify target user if removed by another
    if (!isSelfLeaving) {
      await NotificationService.create({
        userId: targetUserId,
        businessId,
        type: 'TEAM',
        title: 'Removed from Team',
        message: `You have been removed from the team for "${business.name}".`,
        metadata: { businessId },
      });
    }

    return { message: 'Team member removed successfully' };
  }
}
