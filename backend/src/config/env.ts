import dotenv from 'dotenv';
import path from 'path';

// Load local .env files if present (in development)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resolvedClientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
const resolvedBaseUrl = (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').trim();

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reviewtap?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_reviewtap_2026_dev_key_at_least_32_bytes!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_reviewtap_2026_dev_key_at_least_32_bytes!',
  CLIENT_URL: resolvedClientUrl,
  BASE_URL: resolvedBaseUrl,
  IP_SALT: process.env.IP_SALT || 'reviewtap-privacy-salt-2026',
  isProduction: process.env.NODE_ENV === 'production',
};
