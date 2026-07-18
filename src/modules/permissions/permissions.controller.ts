import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function listPermissions(_req: Request, res: Response) {
  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true, description: true },
    orderBy: { key: "asc" },
  });
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, permissions, "Permissions fetched"));
}
