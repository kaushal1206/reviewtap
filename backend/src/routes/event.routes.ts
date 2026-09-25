import { Router } from 'express';
import { EventController } from '../controllers/event.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', EventController.listEvents);

export default router;
