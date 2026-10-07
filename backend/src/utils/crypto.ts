import crypto from 'crypto';
import { config } from '../config';

// AES-256-GCM envelope for provider API keys & secrets.
// Key is derived from MASTER_KEY via scrypt so any sufficiently long secret works.
const SALT = 'voxpilot-v1';
let key: Buffer | null = null;

function getKey(): Buffer {
  if (!key) key = crypto.scryptSync(config.masterKey, SALT, 32);
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith('enc1:')) return payload; // legacy/plain (dev seeds)
  const [, ivB64, tagB64, dataB64] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function maskSecret(_s?: string): string {
  return '••••••••';
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}
