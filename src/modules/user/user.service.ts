import bcrypt from "bcrypt";
import { ErrorMessages, HttpStatus } from "../../constants/index.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type {
  AssignPermissionsInput,
  AssignRolesInput,
  CreateUserInput,
  UpdateUserInput,
} from "./user.validation.js";

const BCRYPT_ROUNDS = 12;

const userSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
  permissions: { select: { permission: { select: { key: true } } } },
} as const;

function serializeUser<
  T extends {
    roles: { role: { id: string; name: string } }[];
    permissions: { permission: { key: string } }[];
  },
>(user: T) {
  const { roles, permissions, ...rest } = user;
  return {
    ...rest,
    roles: roles.map((userRole) => userRole.role),
    // Direct grants only — not the effective (role-derived + direct) set
    // AuthUser.permissions represents for the logged-in user themselves.
    directPermissions: permissions.map((up) => up.permission.key),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" }, select: userSelect });
  return users.map(serializeUser);
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }
  return serializeUser(user);
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(HttpStatus.CONFLICT, ErrorMessages.EMAIL_ALREADY_REGISTERED);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });

  return getUser(user.id);
}

// Blocks an admin from deactivating, re-rolling, or deleting their own
// account through this endpoint — a simple guard against accidental
// self-lockout. Doesn't guarantee at least one Admin always remains if
// there are several; that's a sharper edge not evidenced as a real risk yet.
function assertNotSelf(requestingUserId: string, targetUserId: string) {
  if (requestingUserId === targetUserId) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.CANNOT_MODIFY_SELF);
  }
}

export async function updateUser(requestingUserId: string, id: string, input: UpdateUserInput) {
  assertNotSelf(requestingUserId, id);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  await prisma.user.update({ where: { id }, data: { isActive: input.isActive } });
  return getUser(id);
}

export async function deleteUser(requestingUserId: string, id: string) {
  if (requestingUserId === id) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.CANNOT_DELETE_SELF);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  await prisma.user.delete({ where: { id } });
}

export async function assignRoles(requestingUserId: string, id: string, input: AssignRolesInput) {
  assertNotSelf(requestingUserId, id);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
  if (roles.length !== input.roleIds.length) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.ROLE_NOT_FOUND);
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userRole.createMany({
      data: input.roleIds.map((roleId) => ({ userId: id, roleId })),
    }),
  ]);

  return getUser(id);
}

export async function assignPermissions(
  requestingUserId: string,
  id: string,
  input: AssignPermissionsInput
) {
  assertNotSelf(requestingUserId, id);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  const permissions = await prisma.permission.findMany({
    where: { id: { in: input.permissionIds } },
  });
  if (permissions.length !== input.permissionIds.length) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.PERMISSION_NOT_FOUND);
  }

  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId: id } }),
    prisma.userPermission.createMany({
      data: input.permissionIds.map((permissionId) => ({ userId: id, permissionId })),
    }),
  ]);

  return getUser(id);
}

export function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, isSystem: true },
  });
}

export function listPermissions() {
  return prisma.permission.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, description: true },
  });
}
