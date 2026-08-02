import type { Prisma } from "@prisma/client";
import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/token.js";
import { ApiError } from "../../utils/ApiError.js";
import type {
  AssignPermissionsInput,
  AssignRolesInput,
  CreateUserInput,
  EmployeeDto,
  UpdateUserInput,
} from "./users.types.js";

const ADMIN_ROLE = "ADMIN";

const employeeInclude = {
  roles: { select: { role: { select: { id: true, name: true } } } },
  directPermissions: { select: { permission: { select: { key: true } } } },
} satisfies Prisma.UserInclude;

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof employeeInclude }>;

function toEmployee(user: UserWithAccess): EmployeeDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.status === "ACTIVE",
    createdAt: user.createdAt,
    roles: user.roles.map(({ role }) => ({ id: role.id, name: role.name })),
    directPermissions: user.directPermissions.map(({ permission }) => permission.key),
  };
}

async function assertRolesExist(roleIds: string[]) {
  if (roleIds.length === 0) return;
  const count = await prisma.role.count({ where: { id: { in: roleIds } } });
  if (count !== new Set(roleIds).size) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "One or more roleIds are invalid");
  }
}

async function assertPermissionsExist(permissionIds: string[]) {
  if (permissionIds.length === 0) return;
  const count = await prisma.permission.count({ where: { id: { in: permissionIds } } });
  if (count !== new Set(permissionIds).size) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "One or more permissionIds are invalid");
  }
}

// Guards against locking everyone out: counts ACTIVE admins other than the
// given user. Callers use it before deleting/deactivating/de-admining.
async function otherActiveAdminCount(excludeUserId: string): Promise<number> {
  return prisma.user.count({
    where: {
      id: { not: excludeUserId },
      status: "ACTIVE",
      roles: { some: { role: { name: ADMIN_ROLE } } },
    },
  });
}

async function isAdmin(userId: string): Promise<boolean> {
  const count = await prisma.userRole.count({
    where: { userId, role: { name: ADMIN_ROLE } },
  });
  return count > 0;
}

export async function listUsers(): Promise<EmployeeDto[]> {
  const users = await prisma.user.findMany({
    include: employeeInclude,
    orderBy: { createdAt: "desc" },
  });
  return users.map(toEmployee);
}

export async function createUser(input: CreateUserInput): Promise<EmployeeDto> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(HttpStatus.CONFLICT, "An account with this email already exists");
  }

  await assertRolesExist(input.roleIds);
  await assertPermissionsExist(input.permissionIds);

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      // Admin-created accounts are active immediately; no invite email flow.
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
      directPermissions: {
        create: input.permissionIds.map((permissionId) => ({ permissionId })),
      },
    },
    include: employeeInclude,
  });

  return toEmployee(user);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<EmployeeDto> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(HttpStatus.NOT_FOUND, "User not found");

  if (input.email && input.email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email: input.email } });
    if (clash) throw new ApiError(HttpStatus.CONFLICT, "An account with this email already exists");
  }

  if (input.isActive === false && (await isAdmin(id)) && (await otherActiveAdminCount(id)) === 0) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "Cannot deactivate the last active admin");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.isActive !== undefined && { status: input.isActive ? "ACTIVE" : "SUSPENDED" }),
    },
    include: employeeInclude,
  });
  return toEmployee(updated);
}

export async function deleteUser(id: string, actingUserId: string): Promise<void> {
  if (id === actingUserId) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(HttpStatus.NOT_FOUND, "User not found");

  if ((await isAdmin(id)) && (await otherActiveAdminCount(id)) === 0) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "Cannot delete the last active admin");
  }

  await prisma.user.delete({ where: { id } });
}

export async function assignRoles(id: string, input: AssignRolesInput): Promise<EmployeeDto> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(HttpStatus.NOT_FOUND, "User not found");

  await assertRolesExist(input.roleIds);

  const willBeAdmin = await prisma.role.count({
    where: { id: { in: input.roleIds }, name: ADMIN_ROLE },
  });
  if (!willBeAdmin && (await isAdmin(id)) && (await otherActiveAdminCount(id)) === 0) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "Cannot remove admin from the last active admin");
  }

  // Replace the whole set: clear then re-create inside one transaction.
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userRole.createMany({ data: input.roleIds.map((roleId) => ({ userId: id, roleId })) }),
  ]);

  const updated = await prisma.user.findUniqueOrThrow({ where: { id }, include: employeeInclude });
  return toEmployee(updated);
}

export async function assignPermissions(
  id: string,
  input: AssignPermissionsInput
): Promise<EmployeeDto> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(HttpStatus.NOT_FOUND, "User not found");

  await assertPermissionsExist(input.permissionIds);

  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId: id } }),
    prisma.userPermission.createMany({
      data: input.permissionIds.map((permissionId) => ({ userId: id, permissionId })),
    }),
  ]);

  const updated = await prisma.user.findUniqueOrThrow({ where: { id }, include: employeeInclude });
  return toEmployee(updated);
}
