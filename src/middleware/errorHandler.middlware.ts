import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpStatus, ErrorMessages } from "../constants/index.js";
import { logger } from "../lib/logger.js";
import { ApiError } from "../utils/ApiError.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ success: false, message: ErrorMessages.VALIDATION_FAILED, details: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, message: err.message, details: err.details });
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json({ success: false, message: ErrorMessages.INTERNAL_SERVER_ERROR });
}
