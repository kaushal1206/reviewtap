import { Router } from 'express';
import { AdminPlanController } from '../controllers/admin-plan.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Super Admin restricted access
router.use(authenticateToken);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', AdminPlanController.listPlans);
router.post('/', AdminPlanController.createPlan);
router.patch('/:id', AdminPlanController.updatePlan);
router.get('/subscriptions', AdminPlanController.listSubscriptions);

export default router;
