import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { CreateClientInput, UpdateClientInput } from "./clients.types.js";

// Who is acting, and whether they may see/manage every client or only the
// ones assigned to them. `canReadAll` comes from the clients:read-all grant.
export interface ClientActor {
  userId: string;
  canReadAll: boolean;
}

async function assertAssignedUserExists(assignedUserId: string | null | undefined) {
  if (!assignedUserId) return;
  const user = await prisma.user.findUnique({ where: { id: assignedUserId }, select: { id: true } });
  if (!user) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "assignedUserId does not reference a valid user");
  }
}

// Loads a client and enforces record-level access: a scoped user may only
// touch clients assigned to them.
async function getOwnedClient(id: string, actor: ClientActor) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new ApiError(HttpStatus.NOT_FOUND, "Client not found");
  if (!actor.canReadAll && client.assignedUserId !== actor.userId) {
    // Same 404 as "doesn't exist" so scoped users can't probe for ids.
    throw new ApiError(HttpStatus.NOT_FOUND, "Client not found");
  }
  return client;
}

export function listClients(actor: ClientActor) {
  return prisma.client.findMany({
    where: actor.canReadAll ? {} : { assignedUserId: actor.userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createClient(input: CreateClientInput, actor: ClientActor) {
  // Scoped users can only create clients assigned to themselves; managers
  // (read-all) may assign to anyone.
  const assignedUserId = actor.canReadAll ? input.assignedUserId : actor.userId;
  await assertAssignedUserExists(assignedUserId);
  return prisma.client.create({ data: { ...input, assignedUserId } });
}

export async function updateClient(id: string, input: UpdateClientInput, actor: ClientActor) {
  await getOwnedClient(id, actor);

  const data: UpdateClientInput = { ...input };
  if (!actor.canReadAll) {
    // Scoped users can't reassign a client away from (or to) someone else.
    delete data.assignedUserId;
  } else if ("assignedUserId" in data) {
    await assertAssignedUserExists(data.assignedUserId ?? null);
  }

  return prisma.client.update({ where: { id }, data });
}

export async function deleteClient(id: string, actor: ClientActor) {
  await getOwnedClient(id, actor);
  await prisma.client.delete({ where: { id } });
}
