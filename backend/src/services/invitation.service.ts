import crypto from 'crypto';
import { Role, TeamRole } from '@prisma/client';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { InvitationRepository } from '../repositories/invitation.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { EntitlementService } from './entitlement.service.js';
import { PermissionService } from './permission.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { NotificationService } from './notification.service.js';

export class InvitationService {
  /**
   * Dispatches a new team invitation
   */
  static async inviteMember(
    businessId: string,
    email: string,
    role: TeamRole,
    actor: { id: string; role: Role }
  ) {
    await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_INVITE');

    if (role === 'OWNER') {
      const error: any = new Error('Forbidden: Cannot invite users with the OWNER role');
      error.statusCode = 400;
      throw error;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Enforce subscription plan seat limits
    await EntitlementService.checkTeamMemberLimit(businessId);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        owner: { select: { id: true, email: true, fullName: true } },
      },
    });

    if (!business) {
      const error: any = new Error('Business not found');
      error.statusCode = 404;
      throw error;
    }

    if (business.owner.email.toLowerCase() === normalizedEmail) {
      const error: any = new Error('The specified user is already the primary owner of this business');
      error.statusCode = 400;
      throw error;
    }

    // Check if target user already exists and is a team member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true },
    });

    if (existingUser) {
      const existingMember = await TeamRepository.findMember(businessId, existingUser.id);
      if (existingMember) {
        const error: any = new Error('User is already an active member of this business team');
        error.statusCode = 409;
        throw error;
      }
    }

    // Check for existing pending invitation
    const existingPending = await InvitationRepository.findPendingByEmailAndBusiness(
      businessId,
      normalizedEmail
    );

    if (existingPending) {
      const error: any = new Error(
        'An active invitation has already been sent to this email address'
      );
      error.statusCode = 409;
      error.details = {
        invitationId: existingPending.id,
        expiresAt: existingPending.expiresAt,
      };
      throw error;
    }

    // Generate token and 7-day expiration
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await InvitationRepository.create({
      businessId,
      email: normalizedEmail,
      role,
      token,
      invitedById: actor.id,
      expiresAt,
    });

    // Audit log
    await ActivityLogService.log({
      businessId,
      userId: actor.id,
      action: 'USER_INVITED',
      entityType: 'INVITATION',
      entityId: invitation.id,
      details: {
        invitedEmail: normalizedEmail,
        role,
        expiresAt,
      },
    });

    // If invited user has an account, dispatch in-app notification immediately
    if (existingUser) {
      await NotificationService.create({
        userId: existingUser.id,
        businessId,
        type: 'TEAM',
        title: 'Team Invitation Received',
        message: `You have been invited to join "${business.name}" as ${role}.`,
        metadata: {
          businessId,
          businessName: business.name,
          role,
          token,
        },
      });
    }

    const inviteLink = `${env.CLIENT_URL}/invite/${token}`;

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        invitedBy: invitation.invitedBy,
      },
      inviteLink,
    };
  }

  /**
   * Lists all pending invitations for a business
   */
  static async listInvitations(businessId: string, actor: { id: string; role: Role }) {
    await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_VIEW');
    const invitations = await InvitationRepository.findPendingByBusiness(businessId);
    return { invitations };
  }

  /**
   * Revokes an existing pending invitation
   */
  static async revokeInvitation(
    businessId: string,
    invitationId: string,
    actor: { id: string; role: Role }
  ) {
    await PermissionService.enforcePermission(businessId, actor.id, actor.role, 'TEAM_INVITE');

    await InvitationRepository.revoke(invitationId, businessId);

    // Audit log
    await ActivityLogService.log({
      businessId,
      userId: actor.id,
      action: 'INVITATION_REVOKED',
      entityType: 'INVITATION',
      entityId: invitationId,
    });

    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Validates and returns public preview information for an invitation token
   */
  static async getInvitationByToken(token: string) {
    const invite = await InvitationRepository.findByToken(token);

    if (!invite) {
      const error: any = new Error('Invitation not found or invalid token');
      error.statusCode = 404;
      throw error;
    }

    if (invite.status !== 'PENDING') {
      const error: any = new Error(`This invitation has already been ${invite.status.toLowerCase()}`);
      error.statusCode = 410;
      throw error;
    }

    if (invite.expiresAt < new Date()) {
      await InvitationRepository.updateStatus(invite.id, 'EXPIRED');
      const error: any = new Error('This invitation has expired');
      error.statusCode = 410;
      throw error;
    }

    return {
      invitation: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        business: invite.business,
        invitedBy: invite.invitedBy,
      },
    };
  }

  /**
   * Accepts an invitation and creates the user's team membership
   */
  static async acceptInvitation(
    token: string,
    user: { id: string; email: string; fullName: string }
  ) {
    const invite = await InvitationRepository.findByToken(token);

    if (!invite) {
      const error: any = new Error('Invitation not found or invalid token');
      error.statusCode = 404;
      throw error;
    }

    if (invite.status !== 'PENDING') {
      const error: any = new Error(`This invitation has already been ${invite.status.toLowerCase()}`);
      error.statusCode = 410;
      throw error;
    }

    if (invite.expiresAt < new Date()) {
      await InvitationRepository.updateStatus(invite.id, 'EXPIRED');
      const error: any = new Error('This invitation has expired');
      error.statusCode = 410;
      throw error;
    }

    // Check if user is already a member
    const existingMember = await TeamRepository.findMember(invite.businessId, user.id);
    if (existingMember) {
      await InvitationRepository.updateStatus(invite.id, 'ACCEPTED', new Date());
      return {
        message: 'You are already a member of this business team',
        businessId: invite.businessId,
        role: existingMember.role,
      };
    }

    // Atomic join + accept update
    const [teamMember] = await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          businessId: invite.businessId,
          userId: user.id,
          role: invite.role,
          invitedBy: invite.invitedById,
        },
        include: {
          business: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.invitation.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
    ]);

    // Audit log
    await ActivityLogService.log({
      businessId: invite.businessId,
      userId: user.id,
      action: 'USER_JOINED',
      entityType: 'TEAM_MEMBER',
      entityId: teamMember.id,
      details: {
        role: invite.role,
        invitationId: invite.id,
      },
    });

    // Notify business owner
    const business = await prisma.business.findUnique({
      where: { id: invite.businessId },
      select: { ownerId: true, name: true },
    });

    if (business) {
      await NotificationService.create({
        userId: business.ownerId,
        businessId: invite.businessId,
        type: 'TEAM',
        title: 'New Team Member Joined',
        message: `${user.fullName} (${user.email}) accepted their invitation and joined as ${invite.role}.`,
        metadata: {
          businessId: invite.businessId,
          newUserId: user.id,
          role: invite.role,
        },
      });
    }

    return {
      message: 'Invitation accepted successfully',
      business: teamMember.business,
      role: teamMember.role,
    };
  }
}
