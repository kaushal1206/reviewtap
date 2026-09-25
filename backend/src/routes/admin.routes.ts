import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

export const adminRouter = Router();

adminRouter.get(
  '/overview',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  AdminController.getOverview
);

adminRouter.get(
  '/businesses',
  authenticateToken,
  requireRole('SUPER_ADMIN'),
  AdminController.searchBusinesses
);
