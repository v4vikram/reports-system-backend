import type { Request, Response } from "express";
import type { z } from "zod";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getReportActor } from "../reports/reports.controller.js";
import * as coverageRowsService from "./coverageRows.service.js";
import type { CreateCoverageRowInput, UpdateCoverageRowInput } from "./coverageRows.types.js";
import type { extractFromImageSchema } from "./coverageRows.validation.js";

export async function create(req: Request, res: Response) {
  const row = await coverageRowsService.createCoverageRow(
    req.body as CreateCoverageRowInput,
    await getReportActor(req)
  );
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, row, "Row created"));
}

export async function update(req: Request, res: Response) {
  const row = await coverageRowsService.updateCoverageRow(
    req.params.id as string,
    req.body as UpdateCoverageRowInput,
    await getReportActor(req)
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, row, "Row updated"));
}

export async function remove(req: Request, res: Response) {
  await coverageRowsService.deleteCoverageRow(req.params.id as string, await getReportActor(req));
  res.status(HttpStatus.NO_CONTENT).send();
}

export async function extractFromImage(req: Request, res: Response) {
  if (!req.file) throw new ApiError(HttpStatus.BAD_REQUEST, "No image uploaded");
  const { coverageTableId } = req.body as z.infer<typeof extractFromImageSchema>;

  const table = await coverageRowsService.extractRowsFromImageIntoTable(coverageTableId, await getReportActor(req), {
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
  });
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, table, "Rows extracted from image"));
}
