import type { z } from "zod";
import type { createCoverageRowSchema, updateCoverageRowSchema } from "./coverageRows.validation.js";

export type CreateCoverageRowInput = z.infer<typeof createCoverageRowSchema>;
export type UpdateCoverageRowInput = z.infer<typeof updateCoverageRowSchema>;

export interface CoverageRowDto {
  id: string;
  coverageTableId: string;
  srNo: number;
  headline: string | null;
  publication: string | null;
  edition: string | null;
  pageNo: string | null;
  date: Date | null;
  link: string | null;
  image: string | null;
  isTopCoverage: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
