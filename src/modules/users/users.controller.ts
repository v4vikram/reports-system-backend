import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as usersService from "./users.service.js";
import type {
  AssignPermissionsInput,
  AssignRolesInput,
  CreateUserInput,
  UpdateUserInput,
} from "./users.types.js";

export async function list(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, users, "Users fetched"));
}

export async function create(req: Request, res: Response) {
  const user = await usersService.createUser(req.body as CreateUserInput);
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, user, "User created"));
}

export async function update(req: Request, res: Response) {
  const user = await usersService.updateUser(req.params.id as string, req.body as UpdateUserInput);
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, user, "User updated"));
}

export async function remove(req: Request, res: Response) {
  await usersService.deleteUser(req.params.id as string, req.user!.id);
  res.status(HttpStatus.NO_CONTENT).send();
}

export async function assignRoles(req: Request, res: Response) {
  const user = await usersService.assignRoles(req.params.id as string, req.body as AssignRolesInput);
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, user, "Roles updated"));
}

export async function assignPermissions(req: Request, res: Response) {
  const user = await usersService.assignPermissions(req.params.id as string, req.body as AssignPermissionsInput);
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, user, "Permissions updated"));
}
