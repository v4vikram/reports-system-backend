import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { ACCESS_TOKEN_COOKIE } from "../constants/cookies.js";
import { ErrorMessages, HttpStatus } from "../constants/index.js";
import { getAuthUserById } from "../modules/auth/auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

// Verifies identity from the access token, then re-loads the user's current
// roles/permissions from the DB on every request — never trusts a cached
// claim. See docs/architecture/erd.md#auth-module ("Authorization freshness").
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies[ACCESS_TOKEN_COOKIE];
  if (!token) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  let subject: string | undefined;
  try {
    ({
      payload: { sub: subject },
    } = await jwtVerify(token, ACCESS_SECRET));
  } catch {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  const user = subject ? await getAuthUserById(subject) : null;
  if (!user) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  req.user = user;
  next();
});

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.permissions.includes(permission)) {
      throw new ApiError(HttpStatus.FORBIDDEN, ErrorMessages.FORBIDDEN);
    }
    next();
  };
}
