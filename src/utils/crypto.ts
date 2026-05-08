import crypto from 'crypto';
import { env } from '../config/env';

// AES-256-GCM. Formato armazenado: iv(12).authTag(16).cipher  — tudo em hex.
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

const KEY = Buffer.from(env.ENCRYPTION_KEY, 'hex');

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('hex');
}

export function decrypt(payloadHex: string): string {
  const buf = Buffer.from(payloadHex, 'hex');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}
