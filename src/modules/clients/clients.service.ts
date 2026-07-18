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

// A portal link is only valid onto a CLIENT-role user, and only one client
// per user. Checked explicitly (rather than relying on the DB's unique
// constraint) because errorHandler.middlware.ts doesn't translate raw Prisma
// constraint violations into friendly messages.
async function assertPortalUserValid(portalUserId: string | null | undefined, excludeClientId?: string) {
  if (!portalUserId) return;

  const user = await prisma.user.findUnique({
    where: { id: portalUserId },
    select: { roles: { select: { role: { select: { name: true } } } } },
  });
  if (!user) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "portalUserId does not reference a valid user");
  }
  if (!user.roles.some(({ role }) => role.name === "CLIENT")) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "portalUserId must reference a user with the CLIENT role");
  }

  const clash = await prisma.client.findUnique({ where: { portalUserId }, select: { id: true } });
  if (clash && clash.id !== excludeClientId) {
    throw new ApiError(HttpStatus.CONFLICT, "This user is already linked to another client");
  }
}

// Loads a client and enforces record-level access: a scoped user may only
// touch clients assigned to them (as the responsible employee) or that
// they're the portal login for. Exported for reuse by events/reports, whose
// access is scoped by whichever client they belong to.
export async function getOwnedClient(id: string, actor: ClientActor) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new ApiError(HttpStatus.NOT_FOUND, "Client not found");
  const owns =
    actor.canReadAll || client.assignedUserId === actor.userId || client.portalUserId === actor.userId;
  if (!owns) {
    // Same 404 as "doesn't exist" so scoped users can't probe for ids.
    throw new ApiError(HttpStatus.NOT_FOUND, "Client not found");
  }
  return client;
}

export function listClients(actor: ClientActor) {
  return prisma.client.findMany({
    where: actor.canReadAll
      ? {}
      : { OR: [{ assignedUserId: actor.userId }, { portalUserId: actor.userId }] },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClient(id: string, actor: ClientActor) {
  return getOwnedClient(id, actor);
}

export async function createClient(input: CreateClientInput, actor: ClientActor) {
  // Scoped users can only create clients assigned to themselves; managers
  // (read-all) may assign to anyone.
  const assignedUserId = actor.canReadAll ? input.assignedUserId : actor.userId;
  await assertAssignedUserExists(assignedUserId);
  await assertPortalUserValid(input.portalUserId);
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

  if ("portalUserId" in data) {
    await assertPortalUserValid(data.portalUserId, id);
  }

  return prisma.client.update({ where: { id }, data });
}

export async function deleteClient(id: string, actor: ClientActor) {
  await getOwnedClient(id, actor);
  await prisma.client.delete({ where: { id } });
}
