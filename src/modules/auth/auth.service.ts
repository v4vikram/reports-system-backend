import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import ms from "ms";
import { env } from "../../config/env.js";
import { ErrorMessages, HttpStatus } from "../../constants/index.js";
import { logger } from "../../lib/logger.js";
import { sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import type { AuthUser } from "../../types/auth.types.js";
import { ApiError } from "../../utils/ApiError.js";
import type { LoginInput, RegisterInput, ResetPasswordInput } from "./auth.validation.js";

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(userId: string, email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(ACCESS_SECRET);
}

function signRefreshToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(REFRESH_SECRET);
}

async function createRefreshTokenRecord(userId: string, meta: SessionMeta) {
  const refreshToken = await signRefreshToken(userId);
  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue));

  const record = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  return { refreshToken, record };
}

export async function getAuthUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const roles = user.roles.map((userRole) => ({
    id: userRole.role.id,
    name: userRole.role.name,
  }));

  const permissions = Array.from(
    new Set(
      user.roles.flatMap((userRole) => userRole.role.permissions.map((rp) => rp.permission.key))
    )
  );

  return { id: user.id, name: user.name, email: user.email, roles, permissions };
}

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(HttpStatus.CONFLICT, ErrorMessages.EMAIL_ALREADY_REGISTERED);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });

  return (await getAuthUserById(user.id))!;
}

export async function verifyCredentials(input: LoginInput): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.INVALID_CREDENTIALS);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.INVALID_CREDENTIALS);
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return (await getAuthUserById(user.id))!;
}

export async function issueSession(
  user: { id: string; email: string },
  meta: SessionMeta
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await signAccessToken(user.id, user.email);
  const { refreshToken } = await createRefreshTokenRecord(user.id, meta);
  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(
  rawToken: string,
  meta: SessionMeta
): Promise<{ accessToken: string; refreshToken: string; authUser: AuthUser }> {
  let subject: string | undefined;
  try {
    ({ payload: { sub: subject } } = await jwtVerify(rawToken, REFRESH_SECRET));
  } catch {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.userId !== subject) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  if (existing.revokedAt || existing.expiresAt < new Date()) {
    // Reuse of an already-rotated or expired refresh token — treat as a
    // possible theft and kill every active session for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || !user.isActive) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
  }

  const accessToken = await signAccessToken(user.id, user.email);
  const { refreshToken, record } = await createRefreshTokenRecord(user.id, meta);

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedByTokenId: record.id },
  });

  return { accessToken, refreshToken, authUser: (await getAuthUserById(user.id))! };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always resolve the same way whether or not the email exists, so the
  // response never reveals which emails are registered.
  if (!user || !user.isActive) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${rawToken}`;

  // A delivery failure here must never surface as a different response
  // than the "email not registered" case above — that difference would
  // itself be a user-enumeration oracle. Log it and move on.
  try {
    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to send password reset email");
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_RESET_TOKEN);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
