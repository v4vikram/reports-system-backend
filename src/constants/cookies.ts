import type { CookieOptions } from "express";
import ms from "ms";
import { env } from "../config/env.js";

// Names must match frontend/src/features/auth/constants.ts — no shared
// package between the two apps, so this pairing is a manually-synced
// contract (see docs/architecture/api-contracts.md).
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// SameSite=Lax is sufficient here rather than a separate CSRF token: the
// frontend and backend are deployed as subdomains of the same registrable
// domain (same "site" per the Cookie spec, even though they're different
// origins/ports), so the cookie is sent on same-site fetches, while
// SameSite=Lax still blocks it on cross-site requests from any other origin.
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    maxAge: ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
  };
}

export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    maxAge: ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
  };
}

export function getClearCookieOptions(): CookieOptions {
  return baseCookieOptions();
}
