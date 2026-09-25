import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { hashPassword, comparePassword, generateSecureToken } from '../utils/hash.js';
import { signAccessToken } from '../utils/jwt.js';
import { HTTP_STATUS, REFRESH_COOKIE_NAME, JWT_REFRESH_EXPIRY_DAYS } from '../constants/index.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  role: z.enum(['SUPER_ADMIN', 'BUSINESS_OWNER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'An account with this email already exists',
        });
        return;
      }

      const passwordHash = await hashPassword(data.password);
      const role = data.role || 'BUSINESS_OWNER';

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          role,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate refresh token
      const rawRefreshToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + JWT_REFRESH_EXPIRY_DAYS);

      await prisma.refreshToken.create({
        data: {
          token: rawRefreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      // Sign JWT access token
      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        maxAge: JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user || !user.isActive) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const isMatch = await comparePassword(data.password, user.passwordHash);
      if (!isMatch) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate refresh token
      const rawRefreshToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + JWT_REFRESH_EXPIRY_DAYS);

      await prisma.refreshToken.create({
        data: {
          token: rawRefreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      // Sign JWT access token
      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        maxAge: JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;

      if (!token) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Refresh token not found',
        });
        return;
      }

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
        if (storedToken) {
          await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        }
        res.clearCookie(REFRESH_COOKIE_NAME);
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Refresh token expired or invalid',
        });
        return;
      }

      const accessToken = signAccessToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies[REFRESH_COOKIE_NAME];
      if (token) {
        await prisma.refreshToken.deleteMany({
          where: { token },
        });
      }
      res.clearCookie(REFRESH_COOKIE_NAME);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          businesses: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              slug: true,
              googleReviewUrl: true,
              logoUrl: true,
              category: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
