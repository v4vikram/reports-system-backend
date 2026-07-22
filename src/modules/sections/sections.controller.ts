import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getReportActor } from "../reports/reports.controller.js";
import * as sectionsService from "./sections.service.js";
import type { CreateSectionInput, SectionsQuery, UpdateSectionInput } from "./sections.types.js";

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as SectionsQuery;
  const sections = await sectionsService.listSections(query.reportId, await getReportActor(req));
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, sections, "Sections fetched"));
}

export async function create(req: Request, res: Response) {
  const section = await sectionsService.createSection(req.body as CreateSectionInput, await getReportActor(req));
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, section, "Section created"));
}

export async function update(req: Request, res: Response) {
  const section = await sectionsService.updateSection(
    req.params.id as string,
    req.body as UpdateSectionInput,
    await getReportActor(req)
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, section, "Section updated"));
}

export async function remove(req: Request, res: Response) {
  await sectionsService.deleteSection(req.params.id as string, await getReportActor(req));
  res.status(HttpStatus.NO_CONTENT).send();
}
