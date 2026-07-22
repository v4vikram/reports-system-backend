import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getReportActor } from "../reports/reports.controller.js";
import * as coverageRowsService from "./coverageRows.service.js";
import type { CreateCoverageRowInput, UpdateCoverageRowInput } from "./coverageRows.types.js";

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
