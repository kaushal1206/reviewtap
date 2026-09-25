import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TeamService } from '../services/team.service.js';
import { InvitationService } from '../services/invitation.service.js';
import { HTTP_STATUS } from '../constants/index.js';

const updateRoleSchema = z.object({
  role: z.enum(['MANAGER', 'STAFF'], {
    errorMap: () => ({ message: "Role must be 'MANAGER' or 'STAFF'" }),
  }),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim(),
  role: z.enum(['MANAGER', 'STAFF'], {
    errorMap: () => ({ message: "Role must be 'MANAGER' or 'STAFF'" }),
  }),
});

export class TeamController {
  static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await TeamService.listTeamMembers(id, req.user!);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const userId = req.params.userId as string;
      const { role } = updateRoleSchema.parse(req.body);

      const result = await TeamService.updateMemberRole(businessId, userId, role, req.user!);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const userId = req.params.userId as string;
      const result = await TeamService.removeMember(businessId, userId, req.user!);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const { email, role } = inviteMemberSchema.parse(req.body);

      const result = await InvitationService.inviteMember(businessId, email, role, req.user!);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async listInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const result = await InvitationService.listInvitations(businessId, req.user!);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async revokeInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.params.id as string;
      const invitationId = req.params.invitationId as string;
      const result = await InvitationService.revokeInvitation(businessId, invitationId, req.user!);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getInvitationPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      const result = await InvitationService.getInvitationByToken(token);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invitation token is required' },
        });
        return;
      }

      const result = await InvitationService.acceptInvitation(token, {
        id: req.user!.id,
        email: req.user!.email,
        fullName: (req.user as any).fullName || req.user!.email,
      });

      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
