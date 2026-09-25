import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Anonymize IP address in compliance with GDPR/CCPA.
 * Combines IP with a daily date stamp salt and computes SHA-256 hash.
 */
export function hashIpAddress(ip: string | undefined): string {
  if (!ip) return 'anonymous';
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const salt = process.env.IP_SALT || 'reviewtap-privacy-salt-2026';
  return crypto.createHash('sha256').update(`${ip}-${today}-${salt}`).digest('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(40).toString('hex');
}
