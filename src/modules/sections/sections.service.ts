import type { Section } from "@prisma/client";
import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { getOwnedReport } from "../reports/reports.service.js";
import type { ReportActor } from "../reports/reports.service.js";
import type { CreateSectionInput, SectionDto, UpdateSectionInput } from "./sections.types.js";

function toSectionDto(section: Section): SectionDto {
  return {
    id: section.id,
    reportId: section.reportId,
    name: section.name,
    order: section.order,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

// Loads a section and enforces access via its parent report — Sections carry
// no permission/visibility rules of their own, same pattern as Event under
// Client. Exported: CoverageTables reuse this to check "can this actor see
// the report behind this section."
export async function getOwnedSection(id: string, actor: ReportActor): Promise<Section> {
  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) throw new ApiError(HttpStatus.NOT_FOUND, "Section not found");
  await getOwnedReport(section.reportId, actor);
  return section;
}

export async function listSections(reportId: string, actor: ReportActor): Promise<SectionDto[]> {
  await getOwnedReport(reportId, actor);
  const sections = await prisma.section.findMany({ where: { reportId }, orderBy: { order: "asc" } });
  return sections.map(toSectionDto);
}

export async function createSection(input: CreateSectionInput, actor: ReportActor): Promise<SectionDto> {
  await getOwnedReport(input.reportId, actor);
  const section = await prisma.section.create({
    data: { reportId: input.reportId, name: input.name, order: input.order },
  });
  return toSectionDto(section);
}

export async function updateSection(
  id: string,
  input: UpdateSectionInput,
  actor: ReportActor
): Promise<SectionDto> {
  await getOwnedSection(id, actor);
  const section = await prisma.section.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.order !== undefined && { order: input.order }),
    },
  });
  return toSectionDto(section);
}

export async function deleteSection(id: string, actor: ReportActor): Promise<void> {
  await getOwnedSection(id, actor);
  await prisma.section.delete({ where: { id } });
}
