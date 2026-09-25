import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const usageRouter = Router();

usageRouter.get('/:id/usage', authenticateToken, UsageController.getUsage);
