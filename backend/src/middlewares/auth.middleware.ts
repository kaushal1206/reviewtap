import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { HTTP_STATUS } from '../constants/index.js';
import { Role } from '@prisma/client';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Access token required',
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired access token',
    });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
      return;
    }

    next();
  };
}
