import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const invitationRouter = Router();

// Public invitation preview
invitationRouter.get('/preview/:token', TeamController.getInvitationPreview);

// Authenticated invitation acceptance
invitationRouter.post('/accept', authenticateToken, TeamController.acceptInvitation);
