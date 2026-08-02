import { z } from "zod";

export const createCoverageRowSchema = z.object({
  coverageTableId: z.string().min(1),
  srNo: z.number().int().min(0).default(0),
  headline: z.string().max(500).nullable().default(null),
  publication: z.string().max(200).nullable().default(null),
  edition: z.string().max(120).nullable().default(null),
  // Kept as a string, not a number — real page references include ranges
  // and labels ("3-4", "Front Page"), not just plain integers.
  pageNo: z.string().max(20).nullable().default(null),
  date: z.coerce.date().nullable().default(null),
  link: z.string().max(2000).nullable().default(null),
  image: z.string().max(2000).nullable().default(null),
  isTopCoverage: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

// coverageTableId is immutable after creation, same reasoning as
// Section.reportId — a row never moves between tables, only gets deleted
// and recreated if mis-placed.
export const updateCoverageRowSchema = createCoverageRowSchema.omit({ coverageTableId: true }).partial();

// multipart/form-data body for extractFromImage — the file itself is
// handled by multer separately, this only validates the accompanying field.
export const extractFromImageSchema = z.object({
  coverageTableId: z.string().min(1),
});
