import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────
// Bcrypt — hash + comparação
// ─────────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─────────────────────────────────────────────────────────────
// JWT — assinar + verificar
// ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string; // user_id
  email: string;
}

export function signJwt(payload: JwtPayload): string {
  // @ts-expect-error: jsonwebtoken types are strict but accept string
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
