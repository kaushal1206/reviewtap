import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
  });

if (!env.isProduction) {
  global.prisma = prisma;
}
