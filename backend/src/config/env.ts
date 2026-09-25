import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reviewtap?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_reviewtap_2026_dev_key_at_least_32_bytes!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_reviewtap_2026_dev_key_at_least_32_bytes!',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  BASE_URL: process.env.BASE_URL || 'http://localhost:5000',
  isProduction: process.env.NODE_ENV === 'production',
};
