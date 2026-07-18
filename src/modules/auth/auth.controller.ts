import type { CookieOptions, Request, Response } from "express";
import { env } from "../../config/env.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getUserAccess } from "../../lib/access.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as authService from "./auth.service.js";
import type { BasicUser, LoginInput, RegisterInput, RequestContext } from "./auth.types.js";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
};

// Refresh cookie is scoped to /api/auth — it's only ever needed by the
// refresh/logout endpoints, so it isn't sent on every unrelated request.
const refreshCookieOptions: CookieOptions = { ...baseCookieOptions, path: "/api/auth" };
const accessCookieOptions: CookieOptions = { ...baseCookieOptions, path: "/" };

function requestContext(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.get("user-agent") };
}

// The AuthUser contract the frontend expects: identity + roles + the effective
// (role ∪ direct) permission keys used for client-side capability checks.
async function toAuthUser(user: BasicUser) {
  const access = await getUserAccess(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: access.roles,
    permissions: access.permissions,
  };
}

function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
}

export async function register(req: Request, res: Response) {
  const { user, tokens } = await authService.registerUser(req.body as RegisterInput, requestContext(req));

  setSessionCookies(res, tokens);
  res
    .status(HttpStatus.CREATED)
    .json(
      new ApiResponse(
        HttpStatus.CREATED,
        { user: await toAuthUser(user), accessToken: tokens.accessToken },
        "Registered successfully"
      )
    );
}

export async function login(req: Request, res: Response) {
  const { user, tokens } = await authService.loginUser(req.body as LoginInput, requestContext(req));

  setSessionCookies(res, tokens);
  res
    .status(HttpStatus.OK)
    .json(
      new ApiResponse(
        HttpStatus.OK,
        { user: await toAuthUser(user), accessToken: tokens.accessToken },
        "Logged in successfully"
      )
    );
}

export async function refresh(req: Request, res: Response) {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawRefreshToken) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, "No refresh token provided");
  }

  const { user, tokens } = await authService.refreshSession(rawRefreshToken, requestContext(req));

  setSessionCookies(res, tokens);
  res
    .status(HttpStatus.OK)
    .json(
      new ApiResponse(
        HttpStatus.OK,
        { user: await toAuthUser(user), accessToken: tokens.accessToken },
        "Session refreshed"
      )
    );
}

export async function logout(req: Request, res: Response) {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
  await authService.logoutUser(rawRefreshToken, requestContext(req));

  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(HttpStatus.NO_CONTENT).send();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getUserById(req.user!.id);
  // Frontend getMe expects the user object directly as `data` (not wrapped).
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, await toAuthUser(user), "Current user fetched"));
}
