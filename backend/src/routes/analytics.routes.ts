import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/overview', AnalyticsController.getOverview);
router.get('/trends', AnalyticsController.getTrends);
router.get('/distribution', AnalyticsController.getDistribution);

export default router;
