import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import eventRoutes from './routes/event.routes.js';
import nfcRoutes from './routes/nfc.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import adminPlanRoutes from './routes/admin-plan.routes.js';
import billingRoutes from './routes/billing.routes.js';
import redirectRoutes from './routes/redirect.routes.js';
import { teamRouter } from './routes/team.routes.js';
import { invitationRouter } from './routes/invitation.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { activityRouter } from './routes/activity.routes.js';
import { intelligenceRouter } from './routes/intelligence.routes.js';
import { usageRouter } from './routes/usage.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (for accurate client IP in rate limiting & analytics)
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // relaxed for QR code images and SVG renders
    })
  );

  // Dynamic CORS configuration (accepts configured Vercel frontend, rejects wildcard in production)
  const configuredOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
  ]
    .filter(Boolean)
    .flatMap((url) => (url as string).split(',').map((u) => u.trim()))
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      env.CLIENT_URL,
      ...(!env.isProduction ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
    ])
  ).filter(Boolean);

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
        if (!env.isProduction && /^http:\/\/localhost(:\d+)?$/.test(requestOrigin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy: Origin ${requestOrigin} not permitted.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Parsers
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate Limiting on Authentication
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  });

  // Health check (reused for /api/health and /health, verifying API process + PostgreSQL connectivity)
  app.get(['/api/health', '/health'], async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        service: 'ReviewTap API & Redirect Engine',
        version: '2.0.0',
      });
    } catch (dbError) {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: dbError instanceof Error ? dbError.message : 'Database error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/businesses', businessRoutes);
  app.use('/api/businesses', teamRouter);
  app.use('/api/businesses', activityRouter);
  app.use('/api/businesses', intelligenceRouter);
  app.use('/api/businesses', usageRouter);
  app.use('/api/invitations', invitationRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/nfc', nfcRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/admin/plans', adminPlanRoutes);
  app.use('/api/admin', adminRouter);
  app.use('/api/billing', billingRoutes);

  // Smart Redirection & Public Landing Route
  app.use(redirectRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
