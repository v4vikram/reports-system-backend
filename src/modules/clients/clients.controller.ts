import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { getUserAccess } from "../../lib/access.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as clientsService from "./clients.service.js";
import type { ClientActor } from "./clients.service.js";
import type { CreateClientInput, UpdateClientInput } from "./clients.types.js";

// Exported for reuse by events/reports controllers — their access to a
// client's sub-resources is scoped by this same actor shape.
export async function getClientActor(req: Request): Promise<ClientActor> {
  const access = await getUserAccess(req.user!.id);
  return {
    userId: req.user!.id,
    canReadAll: access.permissions.includes(PERMISSIONS.CLIENTS_READ_ALL),
  };
}

export async function list(req: Request, res: Response) {
  const clients = await clientsService.listClients(await getClientActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, clients, "Clients fetched"));
}

export async function getById(req: Request, res: Response) {
  const client = await clientsService.getClient(req.params.id as string, await getClientActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, client, "Client fetched"));
}

export async function create(req: Request, res: Response) {
  const client = await clientsService.createClient(
    req.body as CreateClientInput,
    await getClientActor(req)
  );
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, client, "Client created"));
}

export async function update(req: Request, res: Response) {
  const client = await clientsService.updateClient(
    req.params.id as string,
    req.body as UpdateClientInput,
    await getClientActor(req)
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, client, "Client updated"));
}

export async function remove(req: Request, res: Response) {
  await clientsService.deleteClient(req.params.id as string, await getClientActor(req));
  res.status(HttpStatus.NO_CONTENT).send();
}
