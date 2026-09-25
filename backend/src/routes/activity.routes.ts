import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const activityRouter = Router();

activityRouter.get('/:id/activity', authenticateToken, ActivityController.getTimeline);
