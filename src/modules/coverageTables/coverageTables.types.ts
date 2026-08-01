import type { z } from "zod";
import type { CoverageRowDto } from "../coverageRows/coverageRows.types.js";
import type {
  coverageTablesQuerySchema,
  createCoverageTableSchema,
  updateCoverageTableSchema,
} from "./coverageTables.validation.js";

export type CreateCoverageTableInput = z.infer<typeof createCoverageTableSchema>;
export type UpdateCoverageTableInput = z.infer<typeof updateCoverageTableSchema>;
export type CoverageTablesQuery = z.infer<typeof coverageTablesQuerySchema>;

export interface ScreenshotItem {
  url: string;
  caption: string | null;
  order: number;
}

export interface CoverageTableDto {
  id: string;
  sectionId: string;
  category: string | null;
  order: number;
  hiddenColumns: string[];
  screenshots: ScreenshotItem[];
  // Hex header/border/tint theme color, or null for "auto" (see
  // coverageTables.validation.ts's colorSchema).
  color: string | null;
  // Embedded, not fetched separately — a table's rows are always needed
  // together with it, unlike Events/Reports which stay independently listable.
  rows: CoverageRowDto[];
  createdAt: Date;
  updatedAt: Date;
}
