import { Router } from 'express';
import { IntelligenceController } from '../controllers/intelligence.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const intelligenceRouter = Router();

intelligenceRouter.get('/:id/intelligence', authenticateToken, IntelligenceController.getIntelligence);
intelligenceRouter.get('/:id/health', authenticateToken, IntelligenceController.getHealth);
intelligenceRouter.get('/:id/insights', authenticateToken, IntelligenceController.getInsights);
intelligenceRouter.patch('/:id/insights/:insightId/dismiss', authenticateToken, IntelligenceController.dismissInsight);
