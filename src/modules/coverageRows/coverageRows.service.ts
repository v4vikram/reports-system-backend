import type { CoverageRow } from "@prisma/client";
import { HttpStatus } from "../../constants/httpStatus.js";
import { extractRowsFromImage } from "../../lib/gemini.js";
import { getOwnedCoverageTable, toCoverageTableDto } from "../coverageTables/coverageTables.service.js";
import type { CoverageTableDto } from "../coverageTables/coverageTables.types.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { ReportActor } from "../reports/reports.service.js";
import type { CoverageRowDto, CreateCoverageRowInput, UpdateCoverageRowInput } from "./coverageRows.types.js";

function toCoverageRowDto(row: CoverageRow): CoverageRowDto {
  return {
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
  };
}

// Loads a row and enforces access via its table -> section -> report chain
// (Rows carry no permission rules of their own).
async function getOwnedRow(id: string, actor: ReportActor): Promise<CoverageRow> {
  const row = await prisma.coverageRow.findUnique({ where: { id } });
  if (!row) throw new ApiError(HttpStatus.NOT_FOUND, "Row not found");
  await getOwnedCoverageTable(row.coverageTableId, actor);
  return row;
}

export async function createCoverageRow(
  input: CreateCoverageRowInput,
  actor: ReportActor
): Promise<CoverageRowDto> {
  await getOwnedCoverageTable(input.coverageTableId, actor);
  const row = await prisma.coverageRow.create({
    data: {
      coverageTableId: input.coverageTableId,
      srNo: input.srNo,
      headline: input.headline,
      publication: input.publication,
      edition: input.edition,
      pageNo: input.pageNo,
      date: input.date,
      link: input.link,
      image: input.image,
      isTopCoverage: input.isTopCoverage,
      order: input.order,
    },
  });
  return toCoverageRowDto(row);
}

export async function updateCoverageRow(
  id: string,
  input: UpdateCoverageRowInput,
  actor: ReportActor
): Promise<CoverageRowDto> {
  await getOwnedRow(id, actor);
  const row = await prisma.coverageRow.update({
    where: { id },
    data: {
      ...(input.srNo !== undefined && { srNo: input.srNo }),
      ...(input.headline !== undefined && { headline: input.headline }),
      ...(input.publication !== undefined && { publication: input.publication }),
      ...(input.edition !== undefined && { edition: input.edition }),
      ...(input.pageNo !== undefined && { pageNo: input.pageNo }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.link !== undefined && { link: input.link }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.isTopCoverage !== undefined && { isTopCoverage: input.isTopCoverage }),
      ...(input.order !== undefined && { order: input.order }),
    },
  });
  return toCoverageRowDto(row);
}

export async function deleteCoverageRow(id: string, actor: ReportActor): Promise<void> {
  await getOwnedRow(id, actor);
  await prisma.coverageRow.delete({ where: { id } });
}

function parseExtractedDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// AI auto-fill: parses a screenshot of a coverage table into rows via
// Gemini (lib/gemini.ts — runs server-side only, the API key never reaches
// the browser) and appends them to the table, continuing srNo/order from
// whatever's already there. Returns the whole table (not just the new rows)
// so the frontend can replace its cached copy in one shot, same convention
// as every other coverage-table-mutating endpoint.
export async function extractRowsFromImageIntoTable(
  coverageTableId: string,
  actor: ReportActor,
  file: { buffer: Buffer; mimeType: string }
): Promise<CoverageTableDto> {
  const table = await getOwnedCoverageTable(coverageTableId, actor);
  const extracted = await extractRowsFromImage(file.buffer, file.mimeType);

  if (extracted.length > 0) {
    const startSrNo = table.rows.reduce((max, row) => Math.max(max, row.srNo), 0) + 1;
    const startOrder = table.rows.length;
    await prisma.coverageRow.createMany({
      data: extracted.map((row, index) => ({
        coverageTableId,
        srNo: startSrNo + index,
        headline: row.headline || null,
        publication: row.publication || null,
        edition: row.edition || null,
        pageNo: row.pageNo || null,
        date: parseExtractedDate(row.date),
        link: row.link || null,
        isTopCoverage: false,
        order: startOrder + index,
      })),
    });
  }

  const updated = await getOwnedCoverageTable(coverageTableId, actor);
  return toCoverageTableDto(updated);
}
