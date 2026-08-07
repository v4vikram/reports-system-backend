import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { clientOwnershipWhere, getOwnedClient } from "../clients/clients.service.js";
import type { ClientActor } from "../clients/clients.service.js";
import type { CreateEventInput, UpdateEventInput } from "./events.types.js";

// Events gate on their own events:* permission keys at the route level
// (events.routes.ts), but row-level visibility/management is still
// inherited entirely from whatever access the actor has to the parent
// Client (see clients.service.ts's getOwnedClient) — a scoped actor can't
// touch another client's events no matter what events:* grants they hold.
async function getOwnedEvent(id: string, actor: ClientActor) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new ApiError(HttpStatus.NOT_FOUND, "Event not found");
  await getOwnedClient(event.clientId, actor); // throws 404 if the client isn't visible
  return event;
}

// clientId omitted lists events across every client the actor can see (the
// flat /dashboard/events page); given, it's scoped to just that one client
// (the per-client detail page) — same ownership rule either way, just
// applied directly vs. via the client relation.
export async function listEvents(clientId: string | undefined, actor: ClientActor) {
  if (clientId) {
    await getOwnedClient(clientId, actor);
    return prisma.event.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  }
  return prisma.event.findMany({
    where: { client: clientOwnershipWhere(actor) },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEvent(id: string, actor: ClientActor) {
  return getOwnedEvent(id, actor);
}

export async function createEvent(input: CreateEventInput, actor: ClientActor) {
  await getOwnedClient(input.clientId, actor);
  return prisma.event.create({ data: input });
}

export async function updateEvent(id: string, input: UpdateEventInput, actor: ClientActor) {
  await getOwnedEvent(id, actor);
  return prisma.event.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.eventDate !== undefined && { eventDate: input.eventDate }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteEvent(id: string, actor: ClientActor) {
  await getOwnedEvent(id, actor);
  await prisma.event.delete({ where: { id } });
}
