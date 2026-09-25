import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/index.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log unexpected errors safely (excluding secrets/passwords)
  if (!err.statusCode || err.statusCode >= 500) {
    console.error('[Unhandled Server Error]:', err);
  }

  if (err instanceof ZodError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data provided',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      message: 'Validation Error',
    });
    return;
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  const code = err.code || (statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR');

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
    message,
  });
}
