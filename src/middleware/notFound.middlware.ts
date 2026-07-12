import type { Request, Response } from "express";
import { HttpStatus, ErrorMessages } from "../constants/index.js";

export function notFoundHandler(req: Request, res: Response) {
  res
    .status(HttpStatus.NOT_FOUND)
    .json({ success: false, message: ErrorMessages.NOT_FOUND, path: req.originalUrl });
}
