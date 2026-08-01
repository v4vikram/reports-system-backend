import type { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  parseDurationMs,
  signAccessToken,
  verifyPassword,
} from "../../lib/token.js";
import { ApiError } from "../../utils/ApiError.js";
import type { BasicUser, LoginInput, RegisterInput, RequestContext } from "./auth.types.js";

const REFRESH_TOKEN_TTL_MS = parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);

async function logAuthEvent(
  userId: string | null,
  event: string,
  ctx: RequestContext,
  metadata?: Record<string, unknown>
) {
  await prisma.authAuditLog.create({
    data: {
      userId: userId ?? undefined,
      event,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

async function issueTokens(userId: string, ctx: RequestContext) {
  const accessToken = signAccessToken({ sub: userId });

  const rawRefreshToken = generateOpaqueToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      createdByIp: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

export async function registerUser(input: RegisterInput, ctx: RequestContext) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(HttpStatus.CONFLICT, "An account with this email already exists");
  }

  // First account ever created owns the instance (ADMIN); everyone after
  // starts with least privilege (CLIENT) and gets elevated by an admin.
  const userCount = await prisma.user.count();
  const roleName = userCount === 0 ? "ADMIN" : "CLIENT";
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new ApiError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      `Role "${roleName}" is not seeded — run the db seed first`
    );
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      status: "ACTIVE",
      roles: { create: { roleId: role.id } },
    },
    select: { id: true, name: true, email: true },
  });

  const tokens = await issueTokens(user.id, ctx);
  await logAuthEvent(user.id, "REGISTER", ctx);

  return { user, tokens };
}

export async function loginUser(input: LoginInput, ctx: RequestContext) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    await logAuthEvent(null, "LOGIN_FAILED", ctx, { email: input.email, reason: "no_such_user" });
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    await logAuthEvent(user.id, "LOGIN_FAILED", ctx, { reason: "bad_password" });
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    await logAuthEvent(user.id, "LOGIN_FAILED", ctx, { reason: "inactive_status", status: user.status });
    throw new ApiError(HttpStatus.FORBIDDEN, "This account is not active");
  }

  const tokens = await issueTokens(user.id, ctx);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAuthEvent(user.id, "LOGIN_SUCCESS", ctx);

  return { user: { id: user.id, name: user.name, email: user.email }, tokens };
}

export async function refreshSession(rawRefreshToken: string, ctx: RequestContext) {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!existing) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  if (existing.revokedAt) {
    // This exact token was already rotated away once — presenting it again
    // means it was copied/stolen. Kill every active session for this user
    // and force a fresh login rather than trusting any of them.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logAuthEvent(existing.userId, "TOKEN_REUSE_DETECTED", ctx);
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Refresh token has already been used");
  }

  if (existing.expiresAt < new Date()) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Refresh token has expired");
  }

  const accessToken = signAccessToken({ sub: existing.userId });

  const rawNewRefreshToken = generateOpaqueToken();
  const newToken = await prisma.refreshToken.create({
    data: {
      userId: existing.userId,
      tokenHash: hashToken(rawNewRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      createdByIp: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedByTokenId: newToken.id },
  });

  await logAuthEvent(existing.userId, "TOKEN_REFRESHED", ctx);

  return { user: existing.user, tokens: { accessToken, refreshToken: rawNewRefreshToken } };
}

export async function logoutUser(rawRefreshToken: string | undefined, ctx: RequestContext) {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (existing && !existing.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    await logAuthEvent(existing.userId, "LOGOUT", ctx);
  }
}

export async function getUserById(id: string): Promise<BasicUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
  return user;
}
