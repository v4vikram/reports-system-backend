import type { SectionType } from "@prisma/client";
import type { z } from "zod";
import type { createSectionSchema, sectionsQuerySchema, updateSectionSchema } from "./sections.validation.js";

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type SectionsQuery = z.infer<typeof sectionsQuerySchema>;

export interface SectionDto {
  id: string;
  reportId: string;
  name: string;
  title: string | null;
  type: SectionType;
  content: string | null;
  image: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
