import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus.js";
import { getUserAccess } from "../lib/access.js";
import { verifyAccessToken } from "../lib/token.js";
import { ApiError } from "../utils/ApiError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;

  if (!token) {
    next(new ApiError(HttpStatus.UNAUTHORIZED, "Authentication required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    next(new ApiError(HttpStatus.UNAUTHORIZED, "Invalid or expired token"));
  }
}

// Authorizes on effective permissions loaded fresh from the DB, so a
// permission change takes effect immediately rather than waiting for the
// access token to expire. Holding ANY of the listed keys passes.
export function requirePermission(...keys: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(HttpStatus.UNAUTHORIZED, "Authentication required"));
      return;
    }
    try {
      const { permissions } = await getUserAccess(req.user.id);
      if (!keys.some((key) => permissions.includes(key))) {
        next(new ApiError(HttpStatus.FORBIDDEN, "Insufficient permissions"));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRole(...roleNames: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(HttpStatus.UNAUTHORIZED, "Authentication required"));
      return;
    }
    try {
      const { roles } = await getUserAccess(req.user.id);
      if (!roles.some((role) => roleNames.includes(role.name))) {
        next(new ApiError(HttpStatus.FORBIDDEN, "Insufficient permissions"));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
