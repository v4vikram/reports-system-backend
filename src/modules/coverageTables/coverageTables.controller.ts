import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getReportActor } from "../reports/reports.controller.js";
import * as coverageTablesService from "./coverageTables.service.js";
import type {
  CoverageTablesQuery,
  CreateCoverageTableInput,
  UpdateCoverageTableInput,
} from "./coverageTables.types.js";

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as CoverageTablesQuery;
  const tables = await coverageTablesService.listCoverageTables(query.sectionId, await getReportActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, tables, "Coverage tables fetched"));
}

export async function create(req: Request, res: Response) {
  const table = await coverageTablesService.createCoverageTable(
    req.body as CreateCoverageTableInput,
    await getReportActor(req)
  );
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, table, "Coverage table created"));
}

export async function update(req: Request, res: Response) {
  const table = await coverageTablesService.updateCoverageTable(
    req.params.id as string,
    req.body as UpdateCoverageTableInput,
    await getReportActor(req)
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, table, "Coverage table updated"));
}

export async function remove(req: Request, res: Response) {
  await coverageTablesService.deleteCoverageTable(req.params.id as string, await getReportActor(req));
  res.status(HttpStatus.NO_CONTENT).send();
}
