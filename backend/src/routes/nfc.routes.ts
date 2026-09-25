import { Router } from 'express';
import { NfcController } from '../controllers/nfc.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Backup QR Code image retrieval
router.get('/:id/qr', NfcController.getQRCode);

// Protected routes
router.use(authenticateToken);

router.post('/', NfcController.create);
router.get('/', NfcController.list);
router.get('/:id', NfcController.getById);
router.patch('/:id', NfcController.update);
router.post('/:id/assign', NfcController.assign);
router.post('/:id/unassign', NfcController.unassign);
router.post('/:id/activate', NfcController.activate);
router.post('/:id/deactivate', NfcController.deactivate);
router.post('/:id/retire', NfcController.retire);

export default router;
