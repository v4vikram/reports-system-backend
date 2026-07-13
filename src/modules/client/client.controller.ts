import { HttpStatus, SuccessMessages } from "../../constants/index.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as clientService from "./client.service.js";

export const list = asyncHandler(async (req, res) => {
  const clients = await clientService.listClients(req.user!);
  new ApiResponse(HttpStatus.OK, clients, SuccessMessages.FETCHED).send(res);
});

export const getOne = asyncHandler<{ id: string }>(async (req, res) => {
  const client = await clientService.getClient(req.user!, req.params.id);
  new ApiResponse(HttpStatus.OK, client, SuccessMessages.FETCHED).send(res);
});

export const create = asyncHandler(async (req, res) => {
  const client = await clientService.createClient(req.body);
  new ApiResponse(HttpStatus.CREATED, client, SuccessMessages.CREATED).send(res);
});

export const update = asyncHandler<{ id: string }>(async (req, res) => {
  const client = await clientService.updateClient(req.params.id, req.body);
  new ApiResponse(HttpStatus.OK, client, SuccessMessages.UPDATED).send(res);
});

export const remove = asyncHandler<{ id: string }>(async (req, res) => {
  await clientService.deleteClient(req.params.id);
  new ApiResponse(HttpStatus.OK, null, SuccessMessages.DELETED).send(res);
});
