import { HttpStatus, SuccessMessages } from "../../constants/index.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as userService from "./user.service.js";

export const list = asyncHandler(async (_req, res) => {
  const users = await userService.listUsers();
  new ApiResponse(HttpStatus.OK, users, SuccessMessages.FETCHED).send(res);
});

export const getOne = asyncHandler<{ id: string }>(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  new ApiResponse(HttpStatus.OK, user, SuccessMessages.FETCHED).send(res);
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  new ApiResponse(HttpStatus.CREATED, user, SuccessMessages.CREATED).send(res);
});

export const update = asyncHandler<{ id: string }>(async (req, res) => {
  const user = await userService.updateUser(req.user!.id, req.params.id, req.body);
  new ApiResponse(HttpStatus.OK, user, SuccessMessages.UPDATED).send(res);
});

export const remove = asyncHandler<{ id: string }>(async (req, res) => {
  await userService.deleteUser(req.user!.id, req.params.id);
  new ApiResponse(HttpStatus.OK, null, SuccessMessages.DELETED).send(res);
});

export const assignRoles = asyncHandler<{ id: string }>(async (req, res) => {
  const user = await userService.assignRoles(req.user!.id, req.params.id, req.body);
  new ApiResponse(HttpStatus.OK, user, SuccessMessages.UPDATED).send(res);
});

export const assignPermissions = asyncHandler<{ id: string }>(async (req, res) => {
  const user = await userService.assignPermissions(req.user!.id, req.params.id, req.body);
  new ApiResponse(HttpStatus.OK, user, SuccessMessages.UPDATED).send(res);
});

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await userService.listRoles();
  new ApiResponse(HttpStatus.OK, roles, SuccessMessages.FETCHED).send(res);
});

export const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await userService.listPermissions();
  new ApiResponse(HttpStatus.OK, permissions, SuccessMessages.FETCHED).send(res);
});
