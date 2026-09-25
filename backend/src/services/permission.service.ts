import { Role, TeamRole } from '@prisma/client';
import { prisma } from '../config/db.js';
import { TeamCapability, hasCapability, ROLE_CAPABILITIES } from '../constants/permissions.js';

export interface UserBusinessAccess {
  role: TeamRole | 'SUPER_ADMIN';
  isOwner: boolean;
  capabilities: TeamCapability[];
}

export class PermissionService {
  /**
   * Resolves the user's effective role and ownership on a specific business
   */
  static async getUserRoleForBusiness(
    businessId: string,
    userId: string,
    platformRole: Role
  ): Promise<UserBusinessAccess | null> {
    if (platformRole === 'SUPER_ADMIN') {
      return {
        role: 'SUPER_ADMIN',
        isOwner: true,
        capabilities: Object.values(ROLE_CAPABILITIES.OWNER),
      };
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, status: true },
    });

    if (!business) {
      return null;
    }

    // Direct business owner
    if (business.ownerId === userId) {
      return {
        role: 'OWNER',
        isOwner: true,
        capabilities: ROLE_CAPABILITIES.OWNER,
      };
    }

    // Check TeamMember join table
    const member = await prisma.teamMember.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!member) {
      return null;
    }

    return {
      role: member.role,
      isOwner: false,
      capabilities: ROLE_CAPABILITIES[member.role] || [],
    };
  }

  /**
   * Tests whether a user can perform an action without throwing
   */
  static async canUserPerform(
    businessId: string,
    userId: string,
    platformRole: Role,
    capability: TeamCapability
  ): Promise<boolean> {
    const access = await this.getUserRoleForBusiness(businessId, userId, platformRole);
    if (!access) return false;
    return hasCapability(access.role, capability);
  }

  /**
   * Enforces that the user has the required capability, throwing 403 / 404 if denied
   */
  static async enforcePermission(
    businessId: string,
    userId: string,
    platformRole: Role,
    capability: TeamCapability
  ): Promise<UserBusinessAccess> {
    const access = await this.getUserRoleForBusiness(businessId, userId, platformRole);

    if (!access) {
      const error: any = new Error('Forbidden: You do not have access to this business');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_BUSINESS_ACCESS';
      throw error;
    }

    if (!hasCapability(access.role, capability)) {
      const error: any = new Error(
        `Forbidden: Role '${access.role}' lacks permission '${capability}' for this business`
      );
      error.statusCode = 403;
      error.code = 'INSUFFICIENT_CAPABILITY';
      error.details = { capability, role: access.role };
      throw error;
    }

    return access;
  }
}
