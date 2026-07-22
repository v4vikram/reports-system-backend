import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { getUserAccess } from "../../lib/access.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getClientActor } from "../clients/clients.controller.js";
import * as reportsService from "./reports.service.js";
import type { ReportActor } from "./reports.service.js";
import type { CreateReportInput, ReportsQuery, UpdateReportInput } from "./reports.types.js";

// Exported so Sections/CoverageTables/CoverageRows controllers (sub-resources
// of a report) can build the same actor without re-deriving it.
export async function getReportActor(req: Request): Promise<ReportActor> {
  const access = await getUserAccess(req.user!.id);
  return {
    userId: req.user!.id,
    canReadAll: access.permissions.includes(PERMISSIONS.REPORTS_READ_ALL),
    portalClientId: access.portalClientId,
  };
}

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as ReportsQuery;
  const reports = await reportsService.listReports(query, await getReportActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, reports, "Reports fetched"));
}

export async function getById(req: Request, res: Response) {
  const report = await reportsService.getReport(req.params.id as string, await getReportActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, report, "Report fetched"));
}

export async function create(req: Request, res: Response) {
  const report = await reportsService.createReport(req.body as CreateReportInput, await getClientActor(req));
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, report, "Report created"));
}

export async function update(req: Request, res: Response) {
  const report = await reportsService.updateReport(
    req.params.id as string,
    req.body as UpdateReportInput,
    await getReportActor(req)
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, report, "Report updated"));
}

export async function remove(req: Request, res: Response) {
  await reportsService.deleteReport(req.params.id as string, await getReportActor(req));
  res.status(HttpStatus.NO_CONTENT).send();
}
