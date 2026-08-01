import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { CreateRoleInput } from "./roles.types.js";

const roleSelect = { id: true, name: true, description: true, isSystem: true } as const;

export function listRoles() {
  return prisma.role.findMany({ select: roleSelect, orderBy: { name: "asc" } });
}

export async function createRole(input: CreateRoleInput) {
  const existing = await prisma.role.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new ApiError(HttpStatus.CONFLICT, "A role with this name already exists");
  }

  if (input.permissionIds.length > 0) {
    const count = await prisma.permission.count({ where: { id: { in: input.permissionIds } } });
    if (count !== new Set(input.permissionIds).size) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "One or more permissionIds are invalid");
    }
  }

  return prisma.role.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      // API-created roles are always custom (deletable), never system roles.
      isSystem: false,
      permissions: { create: input.permissionIds.map((permissionId) => ({ permissionId })) },
    },
    select: roleSelect,
  });
}
