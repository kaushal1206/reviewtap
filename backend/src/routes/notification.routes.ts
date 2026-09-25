import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const notificationRouter = Router();

notificationRouter.get('/', authenticateToken, NotificationController.list);
notificationRouter.patch('/:id/read', authenticateToken, NotificationController.markRead);
notificationRouter.patch('/read-all', authenticateToken, NotificationController.markAllRead);
notificationRouter.patch('/:id/archive', authenticateToken, NotificationController.archive);
