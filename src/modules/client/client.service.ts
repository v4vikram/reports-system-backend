import { ErrorMessages, HttpStatus, PERMISSIONS } from "../../constants/index.js";
import { prisma } from "../../lib/prisma.js";
import type { AuthUser } from "../../types/auth.types.js";
import { ApiError } from "../../utils/ApiError.js";
import type { CreateClientInput, UpdateClientInput } from "./client.validation.js";

// Holders of clients:view-all see every client; everyone else sees only
// clients assigned to them. Deliberately independent of the clients CRUD
// permissions — see docs/architecture/erd.md#client-module — this is the
// actual authorization boundary, not just a display filter.
function canViewAll(user: AuthUser): boolean {
  return user.permissions.includes(PERMISSIONS.CLIENTS_VIEW_ALL);
}

export function listClients(user: AuthUser) {
  return prisma.client.findMany({
    where: canViewAll(user) ? {} : { assignedUserId: user.id },
    orderBy: { name: "asc" },
  });
}

export async function getClient(user: AuthUser, id: string) {
  const client = await prisma.client.findUnique({ where: { id } });

  // 404, not 403, when a non-manager isn't assigned this client — existence
  // itself isn't something to reveal to someone unauthorized to see it.
  if (!client || (!canViewAll(user) && client.assignedUserId !== user.id)) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  return client;
}

async function assertAssigneeExists(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.CLIENT_ASSIGNEE_NOT_FOUND);
  }
}

export async function createClient(input: CreateClientInput) {
  if (input.assignedUserId) {
    await assertAssigneeExists(input.assignedUserId);
  }

  return prisma.client.create({
    data: {
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
      assignedUserId: input.assignedUserId,
    },
  });
}

export async function updateClient(id: string, input: UpdateClientInput) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  if (input.assignedUserId) {
    await assertAssigneeExists(input.assignedUserId);
  }

  return prisma.client.update({
    where: { id },
    data: {
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
      isActive: input.isActive,
      assignedUserId: input.assignedUserId !== undefined ? input.assignedUserId : undefined,
    },
  });
}

export async function deleteClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }
  await prisma.client.delete({ where: { id } });
}
