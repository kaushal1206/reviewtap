import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Public plan catalog
router.get('/plans', SubscriptionController.listPlans);

// Protected endpoints for business owners
router.use(authenticateToken);

router.get('/', SubscriptionController.getSubscription);
router.post('/change-plan', SubscriptionController.changePlan);
router.post('/cancel', SubscriptionController.cancel);
router.post('/reactivate', SubscriptionController.reactivate);

export default router;
