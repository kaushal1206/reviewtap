import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Webhook endpoint (public with signature verification inside controller)
router.post('/webhook', BillingController.handleWebhook);

// Protected endpoints for authenticated business owners
router.use(authenticateToken);

router.post('/orders', BillingController.createOrder);
router.post('/verify', BillingController.verifyPayment);
router.get('/invoices', BillingController.listInvoices);
router.get('/invoices/:id', BillingController.getInvoice);

export default router;
