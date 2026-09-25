import dotenv from 'dotenv';
import path from 'path';

// Load local .env file in development if present
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

const rawDatabaseUrl = process.env.DATABASE_URL?.trim();

// In production, DATABASE_URL must be supplied by the hosting platform (e.g. Render)
if (isProduction) {
  if (!rawDatabaseUrl) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: DATABASE_URL is missing in production environment.\n' +
      'Please configure DATABASE_URL in Render Dashboard → reviewtap-api → Environment with your Render PostgreSQL Internal Database URL.'
    );
  }
  if (rawDatabaseUrl.includes('localhost') || rawDatabaseUrl.includes('127.0.0.1')) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: DATABASE_URL is pointing to localhost in a production environment.\n' +
      'Please update DATABASE_URL in Render Dashboard → reviewtap-api → Environment with your Render PostgreSQL Internal Database URL.'
    );
  }
}

const resolvedDatabaseUrl = rawDatabaseUrl || 'postgresql://postgres:postgres@localhost:5432/reviewtap?schema=public';

// Ensure process.env.DATABASE_URL is explicitly set for Prisma engine
process.env.DATABASE_URL = resolvedDatabaseUrl;

const resolvedClientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
const resolvedBaseUrl = (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').trim();

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || (isProduction ? 'production' : 'development'),
  DATABASE_URL: resolvedDatabaseUrl,
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_reviewtap_2026_dev_key_at_least_32_bytes!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_reviewtap_2026_dev_key_at_least_32_bytes!',
  CLIENT_URL: resolvedClientUrl,
  BASE_URL: resolvedBaseUrl,
  isProduction,
};
