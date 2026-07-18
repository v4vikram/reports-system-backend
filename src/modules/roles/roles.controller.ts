import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as rolesService from "./roles.service.js";
import type { CreateRoleInput } from "./roles.types.js";

export async function list(_req: Request, res: Response) {
  const roles = await rolesService.listRoles();
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, roles, "Roles fetched"));
}

export async function create(req: Request, res: Response) {
  const role = await rolesService.createRole(req.body as CreateRoleInput);
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, role, "Role created"));
}
