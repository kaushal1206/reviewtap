import { TeamRole } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface CreateTeamMemberInput {
  businessId: string;
  userId: string;
  role: TeamRole;
  invitedBy?: string;
}

export class TeamRepository {
  static async listMembers(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            createdAt: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!business) return null;

    // Build unified list with owner first
    const members = [
      {
        id: `owner-${business.owner.id}`,
        userId: business.owner.id,
        businessId: business.id,
        role: 'OWNER' as const,
        isBusinessOwner: true,
        fullName: business.owner.fullName,
        email: business.owner.email,
        joinedAt: business.createdAt,
        invitedBy: null,
      },
      ...business.teamMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        businessId: m.businessId,
        role: m.role,
        isBusinessOwner: false,
        fullName: m.user.fullName,
        email: m.user.email,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
      })),
    ];

    return members;
  }

  static async findMember(businessId: string, userId: string) {
    return prisma.teamMember.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  static async createMember(input: CreateTeamMemberInput) {
    return prisma.teamMember.create({
      data: {
        businessId: input.businessId,
        userId: input.userId,
        role: input.role,
        invitedBy: input.invitedBy || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  static async updateMemberRole(businessId: string, userId: string, role: TeamRole) {
    return prisma.teamMember.update({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  static async removeMember(businessId: string, userId: string) {
    return prisma.teamMember.delete({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    });
  }

  static async countMembers(businessId: string): Promise<number> {
    const [staffCount, business] = await Promise.all([
      prisma.teamMember.count({ where: { businessId } }),
      prisma.business.findUnique({
        where: { id: businessId },
        select: { ownerId: true },
      }),
    ]);

    // +1 for the primary business owner
    return staffCount + (business ? 1 : 0);
  }

  static async findMemberBusinesses(userId: string) {
    const [ownedBusinesses, memberRecords] = await Promise.all([
      prisma.business.findMany({
        where: { ownerId: userId, deletedAt: null },
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { scanEvents: true } },
        },
      }),
      prisma.teamMember.findMany({
        where: { userId, business: { deletedAt: null } },
        include: {
          business: {
            include: {
              subscription: { include: { plan: true } },
              _count: { select: { scanEvents: true } },
            },
          },
        },
      }),
    ]);

    const result = [
      ...ownedBusinesses.map((b) => ({
        business: b,
        role: 'OWNER' as const,
        isOwner: true,
      })),
      ...memberRecords.map((m) => ({
        business: m.business,
        role: m.role,
        isOwner: false,
      })),
    ];

    return result;
  }
}
