import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getClientActor } from "../clients/clients.controller.js";
import * as eventsService from "./events.service.js";
import type { CreateEventInput, EventsQuery, UpdateEventInput } from "./events.types.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function list(req: Request, res: Response) {
  const { clientId } = req.query as unknown as EventsQuery;
  const events = await eventsService.listEvents(clientId, await getClientActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, events, "Events fetched"));
}

export async function getById(req: Request, res: Response) {
  const event = await eventsService.getEvent(req.params.id as string, await getClientActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, event, "Event fetched"));
}

export async function create(req: Request, res: Response) {
  const event = await eventsService.createEvent(req.body as CreateEventInput, await getClientActor(req));
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, event, "Event created"));
}

export async function update(req: Request, res: Response) {
  const event = await eventsService.updateEvent(
    req.params.id as string,
    req.body as UpdateEventInput,
    await getClientActor(req)
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, event, "Event updated"));
}

export async function remove(req: Request, res: Response) {
  await eventsService.deleteEvent(req.params.id as string, await getClientActor(req));
  res.status(HttpStatus.NO_CONTENT).send();
}
