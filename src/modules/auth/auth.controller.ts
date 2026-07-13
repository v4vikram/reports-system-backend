import type { Request, Response } from "express";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAccessTokenCookieOptions,
  getClearCookieOptions,
  getRefreshTokenCookieOptions,
} from "../../constants/cookies.js";
import { ErrorMessages, HttpStatus, SuccessMessages } from "../../constants/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";

function sessionMeta(req: Request) {
  return { userAgent: req.get("user-agent"), ipAddress: req.ip };
}

function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, getAccessTokenCookieOptions());
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getRefreshTokenCookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const authUser = await authService.registerUser(req.body);
  const tokens = await authService.issueSession(
    { id: authUser.id, email: authUser.email },
    sessionMeta(req)
  );
  setSessionCookies(res, tokens);
  new ApiResponse(HttpStatus.CREATED, { user: authUser }, SuccessMessages.CREATED).send(res);
});

export const login = asyncHandler(async (req, res) => {
  const authUser = await authService.verifyCredentials(req.body);
  const tokens = await authService.issueSession(
    { id: authUser.id, email: authUser.email },
    sessionMeta(req)
  );
  setSessionCookies(res, tokens);
  new ApiResponse(HttpStatus.OK, { user: authUser }, SuccessMessages.SUCCESS).send(res);
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[REFRESH_TOKEN_COOKIE];
  if (!rawToken) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  const { accessToken, refreshToken, authUser } = await authService.rotateRefreshToken(
    rawToken,
    sessionMeta(req)
  );
  setSessionCookies(res, { accessToken, refreshToken });
  new ApiResponse(HttpStatus.OK, { user: authUser }, SuccessMessages.SUCCESS).send(res);
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[REFRESH_TOKEN_COOKIE];
  if (rawToken) {
    await authService.revokeRefreshToken(rawToken);
  }
  res.clearCookie(ACCESS_TOKEN_COOKIE, getClearCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, getClearCookieOptions());
  new ApiResponse(HttpStatus.OK, null, SuccessMessages.SUCCESS).send(res);
});

export const me = asyncHandler(async (req, res) => {
  new ApiResponse(HttpStatus.OK, req.user, SuccessMessages.FETCHED).send(res);
});
