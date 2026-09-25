import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { hashIpAddress } from '../utils/hash.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { HTTP_STATUS } from '../constants/index.js';

export class RedirectController {
  /**
   * Primary Smart Redirect Engine: /r/:slug
   * Instant 302 redirection to Google Review URL with async telemetry logging
   */
  static async handleRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = String(req.params.slug);
      const sourceQuery = (req.query.src as string) || 'QR'; // QR, NFC, or DIRECT

      // Try finding by business slug
      const businessBySlug = await prisma.business.findFirst({
        where: {
          slug,
          deletedAt: null,
        },
        include: {
          tapSources: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      let targetBusiness = businessBySlug;
      let matchedTapSourceId: string | null = null;

      // If not found by business slug, try by TapSource shortCode
      if (!targetBusiness) {
        const tapSource = await prisma.tapSource.findFirst({
          where: {
            shortCode: slug,
            isActive: true,
          },
          include: { business: true },
        });

        if (tapSource && tapSource.business && !tapSource.business.deletedAt) {
          targetBusiness = {
            ...tapSource.business,
            tapSources: [tapSource],
          };
          matchedTapSourceId = tapSource.id;
        }
      } else {
        matchedTapSourceId = targetBusiness.tapSources[0]?.id || null;
      }

      // Check if business exists, is ACTIVE, and is not soft-deleted
      if (!targetBusiness || targetBusiness.status !== 'ACTIVE' || targetBusiness.deletedAt) {
        res.status(HTTP_STATUS.NOT_FOUND).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ReviewTap — Business Inactive</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { max-width: 420px; padding: 36px 32px; background: #111827; border-radius: 20px; text-align: center; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
                h1 { font-size: 20px; margin-bottom: 10px; color: #f87171; }
                p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                .badge { display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.1); color: #f87171; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.2); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">Link Inactive</div>
                <h1>Profile Temporarily Unavailable</h1>
                <p>The ReviewTap QR code or NFC card you tapped is currently inactive or paused by the business owner.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Asynchronous non-blocking telemetry logging
      const forwardedFor = req.headers['x-forwarded-for'];
      const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor as string) || req.socket.remoteAddress || '';
      const userAgent = (req.headers['user-agent'] as string) || '';
      const parsedUA = parseUserAgent(userAgent);
      const ipHash = hashIpAddress(rawIp);

      const resolvedSourceType = sourceQuery.toUpperCase() === 'NFC' ? 'NFC' : 'QR';

      // Log in background without delaying HTTP 302 redirect
      const businessId = targetBusiness.id;
      const reviewUrl = targetBusiness.googleReviewUrl;
      const businessName = targetBusiness.name;

      setImmediate(async () => {
        try {
          await prisma.scanEvent.create({
            data: {
              businessId,
              tapSourceId: matchedTapSourceId,
              sourceType: resolvedSourceType,
              ipHash,
              userAgent,
              deviceType: parsedUA.deviceType,
              os: parsedUA.os,
              browser: parsedUA.browser,
            },
          });
        } catch (err) {
          console.error('[Telemetry Error]:', err);
        }
      });

      // If client requests interactive landing view (e.g. ?landing=true)
      if (req.query.landing === 'true') {
        res.redirect(`${env.CLIENT_URL}/review/${targetBusiness.slug}`);
        return;
      }

      // Primary Flow: Instant HTTP 302 Redirect to Google Review Page
      res.setHeader('Location', reviewUrl);
      res.status(HTTP_STATUS.MOVED_TEMPORARILY).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="0;url=${reviewUrl}">
            <title>Redirecting to Google Review...</title>
            <script>window.location.replace("${reviewUrl}");</script>
          </head>
          <body style="background:#0b0f19;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <p>Taking you to review <strong>${businessName}</strong> on Google... <a href="${reviewUrl}" style="color:#818cf8;">Click here if not redirected automatically</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dedicated NFC Smart Redirect Engine: /r/nfc/:publicId
   * Validates card status, logs async NFC telemetry, and redirects 302 to Google Review URL
   */
  static async handleNfcRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const publicId = String(req.params.publicId).toUpperCase();

      const card = await prisma.nfcCard.findUnique({
        where: { publicId },
        include: {
          business: true,
        },
      });

      if (!card) {
        res.status(HTTP_STATUS.NOT_FOUND).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ReviewTap — Card Not Found</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { max-width: 420px; padding: 36px 32px; background: #111827; border-radius: 20px; text-align: center; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
                h1 { font-size: 20px; margin-bottom: 10px; color: #f87171; }
                p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                .badge { display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.1); color: #f87171; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.2); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">Unrecognized Card</div>
                <h1>NFC Card Not Found</h1>
                <p>The ReviewTap card identifier (${publicId}) is not registered in our system.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Check card status lifecycle
      if (card.status === 'UNASSIGNED') {
        res.status(HTTP_STATUS.NOT_FOUND).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ReviewTap — Unassigned Card</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { max-width: 420px; padding: 36px 32px; background: #111827; border-radius: 20px; text-align: center; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
                h1 { font-size: 20px; margin-bottom: 10px; color: #fbbf24; }
                p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                .badge { display: inline-block; padding: 4px 12px; background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid rgba(251, 191, 36, 0.2); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">Card Unassigned</div>
                <h1>Not Yet Configured</h1>
                <p>This ReviewTap NFC card has not yet been assigned to a business profile.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }

      if (card.status === 'INACTIVE' || card.status === 'RETIRED' || card.status !== 'ACTIVE') {
        res.status(HTTP_STATUS.NOT_FOUND).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ReviewTap — Card Inactive</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { max-width: 420px; padding: 36px 32px; background: #111827; border-radius: 20px; text-align: center; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
                h1 { font-size: 20px; margin-bottom: 10px; color: #f87171; }
                p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                .badge { display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.1); color: #f87171; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.2); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">Card ${card.status}</div>
                <h1>Card Not Active</h1>
                <p>This NFC card is currently paused or inactive. Please contact the business owner to reactivate it.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Verify business is active and not soft-deleted
      const targetBusiness = card.business;
      if (!targetBusiness || targetBusiness.status !== 'ACTIVE' || targetBusiness.deletedAt) {
        res.status(HTTP_STATUS.NOT_FOUND).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ReviewTap — Business Inactive</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { max-width: 420px; padding: 36px 32px; background: #111827; border-radius: 20px; text-align: center; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
                h1 { font-size: 20px; margin-bottom: 10px; color: #f87171; }
                p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                .badge { display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.1); color: #f87171; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.2); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">Business Inactive</div>
                <h1>Profile Temporarily Unavailable</h1>
                <p>The business linked to this card is currently inactive.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Asynchronous non-blocking telemetry logging
      const forwardedFor = req.headers['x-forwarded-for'];
      const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor as string) || req.socket.remoteAddress || '';
      const userAgent = (req.headers['user-agent'] as string) || '';
      const parsedUA = parseUserAgent(userAgent);
      const ipHash = hashIpAddress(rawIp);

      const businessId = targetBusiness.id;
      const cardId = card.id;
      const reviewUrl = targetBusiness.googleReviewUrl;
      const businessName = targetBusiness.name;

      setImmediate(async () => {
        try {
          await prisma.scanEvent.create({
            data: {
              businessId,
              nfcCardId: cardId,
              sourceType: 'NFC',
              ipHash,
              userAgent,
              deviceType: parsedUA.deviceType,
              os: parsedUA.os,
              browser: parsedUA.browser,
            },
          });
        } catch (err) {
          console.error('[NFC Telemetry Error]:', err);
        }
      });

      // If interactive landing view is requested
      if (req.query.landing === 'true') {
        res.redirect(`${env.CLIENT_URL}/review/${targetBusiness.slug}?src=nfc`);
        return;
      }

      // Primary Flow: Instant HTTP 302 Redirect to Google Review Destination
      res.setHeader('Location', reviewUrl);
      res.status(HTTP_STATUS.MOVED_TEMPORARILY).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="0;url=${reviewUrl}">
            <title>Redirecting to Google Review...</title>
            <script>window.location.replace("${reviewUrl}");</script>
          </head>
          <body style="background:#0b0f19;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <p>Taking you to review <strong>${businessName}</strong> on Google... <a href="${reviewUrl}" style="color:#818cf8;">Click here if not redirected automatically</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public endpoint to fetch business details for the landing page
   */
  static async getPublicBusinessData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = String(req.params.slug);

      const business = await prisma.business.findFirst({
        where: {
          slug,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          googleReviewUrl: true,
          logoUrl: true,
          category: true,
          address: true,
          phone: true,
          website: true,
          whatsapp: true,
          instagram: true,
          brandingSettings: true,
          status: true,
        },
      });

      if (!business) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Business not found or currently inactive',
          },
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { business },
      });
    } catch (error) {
      next(error);
    }
  }
}
