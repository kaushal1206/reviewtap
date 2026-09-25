import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const teamRouter = Router();

// Team Management
teamRouter.get('/:id/team', authenticateToken, TeamController.listMembers);
teamRouter.patch('/:id/team/:userId/role', authenticateToken, TeamController.updateMemberRole);
teamRouter.delete('/:id/team/:userId', authenticateToken, TeamController.removeMember);

// Invitations (Business-scoped)
teamRouter.post('/:id/invitations', authenticateToken, TeamController.inviteMember);
teamRouter.get('/:id/invitations', authenticateToken, TeamController.listInvitations);
teamRouter.delete('/:id/invitations/:invitationId', authenticateToken, TeamController.revokeInvitation);
