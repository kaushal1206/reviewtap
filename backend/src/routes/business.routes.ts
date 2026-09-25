import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// QR Code public image retrieval (downloadable by id)
router.get('/:id/qr', BusinessController.getQRCode);

// Protected routes
router.use(authenticateToken);

router.post('/', BusinessController.create);
router.get('/', BusinessController.list);
router.get('/:id', BusinessController.getById);
router.patch('/:id', BusinessController.update);
router.patch('/:id/status', BusinessController.updateStatus);
router.delete('/:id', BusinessController.delete);

export default router;
