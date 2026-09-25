import { Request, Response, NextFunction } from 'express';
import { TeamCapability } from '../constants/permissions.js';
import { PermissionService } from '../services/permission.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export function requireBusinessPermission(capability: TeamCapability) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const businessId =
      req.params.businessId ||
      req.params.id ||
      req.body?.businessId ||
      (req.query?.businessId as string | undefined);

    if (!businessId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Business ID is required to evaluate permissions',
      });
      return;
    }

    try {
      const access = await PermissionService.enforcePermission(
        businessId,
        req.user.id,
        req.user.role,
        capability
      );

      req.businessId = businessId;
      req.businessAccess = access;
      next();
    } catch (err: any) {
      const statusCode = err.statusCode || HTTP_STATUS.FORBIDDEN;
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.code || 'FORBIDDEN',
          message: err.message || 'Permission denied',
          details: err.details,
        },
      });
    }
  };
}
