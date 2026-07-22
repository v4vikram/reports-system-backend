import { z } from "zod";

export const createSectionSchema = z.object({
  reportId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(160),
  order: z.number().int().min(0).default(0),
});

// reportId is immutable after creation, same reasoning as Event.clientId /
// Report.eventId — a section's report is never accepted as independent input.
export const updateSectionSchema = createSectionSchema.omit({ reportId: true }).partial();

export const sectionsQuerySchema = z.object({
  reportId: z.string().min(1),
});
