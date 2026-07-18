import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AccessTokenPayload } from "../types/auth.types.js";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Refresh tokens are opaque (not JWTs) — they carry no data, only identify
// a row in refresh_tokens, so they can be revoked server-side at any time.
export function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

// Only the hash is ever persisted — see docs/ERD.md "Secrets at rest".
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ sub: payload.sub }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Parses simple "15m" / "7d" style strings used by JWT_*_EXPIRES_IN so we
// can compute refresh_tokens.expires_at without pulling in a date library.
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration string "${duration}"`);
  }
  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNITS[unit];
}
