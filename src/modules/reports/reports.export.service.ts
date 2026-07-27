import { prisma } from "../../lib/prisma.js";
import type { ScreenshotItem } from "../coverageTables/coverageTables.types.js";
import type { ReportActor } from "./reports.service.js";
import { getOwnedReport } from "./reports.service.js";
import type { CanvasPage } from "./reports.types.js";

export interface ExportRow {
  srNo: number;
  headline: string | null;
  publication: string | null;
  edition: string | null;
  pageNo: string | null;
  date: Date | null;
  link: string | null;
  image: string | null;
  isTopCoverage: boolean;
}

export interface ExportTable {
  category: string | null;
  hiddenColumns: string[];
  rows: ExportRow[];
  screenshots: ScreenshotItem[];
  color: string | null;
}

export interface ExportSection {
  name: string;
  title: string | null;
  tables: ExportTable[];
}

export interface ReportExportData {
  reportTitle: string;
  coverPages: CanvasPage[];
  sections: ExportSection[];
}

// Aggregates everything a PDF export needs into one plain tree — the PDF
// renderer (reports.pdf.ts) only knows how to draw this shape, not how to
// query for it, so the two concerns (access-checked data fetch vs. layout)
// stay separate and either can change without touching the other.
export async function getReportExportData(id: string, actor: ReportActor): Promise<ReportExportData> {
  const report = await getOwnedReport(id, actor);

  const sections = await prisma.section.findMany({
    where: { reportId: id, type: "standard" },
    orderBy: { order: "asc" },
    include: {
      tables: {
        orderBy: { order: "asc" },
        include: { rows: { orderBy: { order: "asc" } } },
      },
    },
  });

  return {
    reportTitle: report.title,
    coverPages: report.coverPages as unknown as CanvasPage[],
    sections: sections.map((section) => ({
      name: section.name,
      title: section.title,
      tables: section.tables.map((table) => ({
        category: table.category,
        hiddenColumns: table.hiddenColumns,
        // Only ever written through updateCoverageTableSchema's validated
        // shape (see coverageTables.validation.ts) — safe to trust here.
        screenshots: table.screenshots as unknown as ScreenshotItem[],
        color: table.color,
        rows: table.rows.map((row) => ({
          srNo: row.srNo,
          headline: row.headline,
          publication: row.publication,
          edition: row.edition,
          pageNo: row.pageNo,
          date: row.date,
          link: row.link,
          image: row.image,
          isTopCoverage: row.isTopCoverage,
        })),
      })),
    })),
  };
}
