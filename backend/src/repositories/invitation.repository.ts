import { InvitationStatus, TeamRole } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface CreateInvitationInput {
  businessId: string;
  email: string;
  role: TeamRole;
  token: string;
  invitedById: string;
  expiresAt: Date;
}

export class InvitationRepository {
  static async create(input: CreateInvitationInput) {
    return prisma.invitation.create({
      data: {
        businessId: input.businessId,
        email: input.email.toLowerCase().trim(),
        role: input.role,
        token: input.token,
        invitedById: input.invitedById,
        expiresAt: input.expiresAt,
        status: 'PENDING',
      },
      include: {
        business: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async findByToken(token: string) {
    return prisma.invitation.findUnique({
      where: { token },
      include: {
        business: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        invitedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async findPendingByEmailAndBusiness(businessId: string, email: string) {
    return prisma.invitation.findFirst({
      where: {
        businessId,
        email: email.toLowerCase().trim(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
  }

  static async findPendingByBusiness(businessId: string) {
    return prisma.invitation.findMany({
      where: {
        businessId,
        status: 'PENDING',
      },
      include: {
        invitedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateStatus(id: string, status: InvitationStatus, acceptedAt?: Date) {
    return prisma.invitation.update({
      where: { id },
      data: {
        status,
        ...(acceptedAt ? { acceptedAt } : {}),
      },
    });
  }

  static async revoke(id: string, businessId: string) {
    return prisma.invitation.updateMany({
      where: { id, businessId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
  }

  static async countPending(businessId: string): Promise<number> {
    return prisma.invitation.count({
      where: {
        businessId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
  }
}
