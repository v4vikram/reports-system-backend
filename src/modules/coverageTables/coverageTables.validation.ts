import { z } from "zod";

// The fixed set of columns a coverage row actually has. hiddenColumns is
// validated against this enum (not a bare string[]) so a typo 400s instead
// of silently matching nothing and doing nothing.
export const COVERAGE_COLUMN_KEYS = [
  "srNo",
  "isTopCoverage",
  "headline",
  "publication",
  "edition",
  "pageNo",
  "date",
  "link",
  "image",
] as const;

export const createCoverageTableSchema = z.object({
  sectionId: z.string().min(1),
  category: z.string().max(80).nullable().default(null),
  order: z.number().int().min(0).default(0),
});

const screenshotSchema = z.object({
  url: z.string().min(1).max(2000),
  caption: z.string().max(500).nullable().default(null),
  order: z.number().int().min(0).default(0),
});

// sectionId is immutable after creation, same reasoning as Section.reportId.
export const updateCoverageTableSchema = z.object({
  category: z.string().max(80).nullable().optional(),
  order: z.number().int().min(0).optional(),
  hiddenColumns: z.array(z.enum(COVERAGE_COLUMN_KEYS)).optional(),
  // Full-replace-the-set semantics, same convention as assignRoles/assignPermissions.
  screenshots: z.array(screenshotSchema).optional(),
});

export const coverageTablesQuerySchema = z.object({
  sectionId: z.string().min(1),
});
