import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JWT_ACCESS_EXPIRY } from '../constants/index.js';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
