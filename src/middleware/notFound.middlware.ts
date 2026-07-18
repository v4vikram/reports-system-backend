import type { Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export function notFoundHandler(req: Request, res: Response) {
  res
    .status(HttpStatus.NOT_FOUND)
    .json(new ApiResponse(HttpStatus.NOT_FOUND, null, `Route ${req.originalUrl} not found`));
}
