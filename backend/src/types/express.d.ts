import { Role } from '@prisma/client';
import { UserBusinessAccess } from '../services/permission.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
      businessId?: string;
      businessAccess?: UserBusinessAccess;
    }
  }
}
