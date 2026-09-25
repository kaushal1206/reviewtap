import { Router } from 'express';
import { RedirectController } from '../controllers/redirect.controller.js';

const router = Router();

// Public endpoint for business landing page details
router.get('/api/public/business/:slug', RedirectController.getPublicBusinessData);

// Dedicated NFC short redirect: /r/nfc/:publicId
router.get('/r/nfc/:publicId', RedirectController.handleNfcRedirect);

// Direct short redirect: /r/:slug
router.get('/r/:slug', RedirectController.handleRedirect);

export default router;
