import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpStatus } from "../constants/httpStatus.js";
import { logger } from "../lib/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res
      .status(HttpStatus.BAD_REQUEST)
      .json(new ApiResponse(HttpStatus.BAD_REQUEST, err.flatten(), "Validation failed"));
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.details ?? null, err.message));
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json(new ApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, null, "Internal server error"));
}
