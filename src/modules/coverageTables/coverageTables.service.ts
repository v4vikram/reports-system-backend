import type { Prisma } from "@prisma/client";
import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { ReportActor } from "../reports/reports.service.js";
import { getOwnedSection } from "../sections/sections.service.js";
import type {
  CoverageTableDto,
  CreateCoverageTableInput,
  ScreenshotItem,
  UpdateCoverageTableInput,
} from "./coverageTables.types.js";

const coverageTableInclude = {
  rows: { orderBy: { order: "asc" } },
} satisfies Prisma.CoverageTableInclude;

type CoverageTableWithRows = Prisma.CoverageTableGetPayload<{ include: typeof coverageTableInclude }>;

function toCoverageTableDto(table: CoverageTableWithRows): CoverageTableDto {
  return {
    id: table.id,
    sectionId: table.sectionId,
    category: table.category,
    order: table.order,
    hiddenColumns: table.hiddenColumns,
    // Only ever written through updateCoverageTableSchema's validated shape
    // (see coverageTables.validation.ts) — safe to trust at read time.
    screenshots: table.screenshots as unknown as ScreenshotItem[],
    rows: table.rows.map((row) => ({
      id: row.id,
      coverageTableId: row.coverageTableId,
      srNo: row.srNo,
      headline: row.headline,
      publication: row.publication,
      edition: row.edition,
      pageNo: row.pageNo,
      date: row.date,
      link: row.link,
      image: row.image,
      isTopCoverage: row.isTopCoverage,
      order: row.order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };
}

// Loads a table and enforces access via its section -> report chain (Tables
// carry no permission rules of their own). Exported: CoverageRows reuse this
// to check "can this actor see the report behind this row's table."
export async function getOwnedCoverageTable(id: string, actor: ReportActor): Promise<CoverageTableWithRows> {
  const table = await prisma.coverageTable.findUnique({ where: { id }, include: coverageTableInclude });
  if (!table) throw new ApiError(HttpStatus.NOT_FOUND, "Coverage table not found");
  await getOwnedSection(table.sectionId, actor);
  return table;
}

export async function listCoverageTables(sectionId: string, actor: ReportActor): Promise<CoverageTableDto[]> {
  await getOwnedSection(sectionId, actor);
  const tables = await prisma.coverageTable.findMany({
    where: { sectionId },
    include: coverageTableInclude,
    orderBy: { order: "asc" },
  });
  return tables.map(toCoverageTableDto);
}

export async function createCoverageTable(
  input: CreateCoverageTableInput,
  actor: ReportActor
): Promise<CoverageTableDto> {
  await getOwnedSection(input.sectionId, actor);
  const table = await prisma.coverageTable.create({
    data: { sectionId: input.sectionId, category: input.category, order: input.order },
    include: coverageTableInclude,
  });
  return toCoverageTableDto(table);
}

export async function updateCoverageTable(
  id: string,
  input: UpdateCoverageTableInput,
  actor: ReportActor
): Promise<CoverageTableDto> {
  await getOwnedCoverageTable(id, actor);
  const table = await prisma.coverageTable.update({
    where: { id },
    data: {
      ...(input.category !== undefined && { category: input.category }),
      ...(input.order !== undefined && { order: input.order }),
      ...(input.hiddenColumns !== undefined && { hiddenColumns: input.hiddenColumns }),
      ...(input.screenshots !== undefined && {
        screenshots: input.screenshots as unknown as Prisma.InputJsonValue,
      }),
    },
    include: coverageTableInclude,
  });
  return toCoverageTableDto(table);
}

export async function deleteCoverageTable(id: string, actor: ReportActor): Promise<void> {
  await getOwnedCoverageTable(id, actor);
  await prisma.coverageTable.delete({ where: { id } });
}
