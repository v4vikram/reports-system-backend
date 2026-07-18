import { z } from "zod";

// clientId is intentionally NOT accepted here — it's always derived from
// eventId server-side (reports.service.ts), so there's no input surface
// where client/event could disagree.
export const createReportSchema = z.object({
  eventId: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(160),
  content: z.string().max(20000).nullable().default(null),
  assigneeUserIds: z.array(z.string().min(1)).default([]),
});

// eventId is immutable after creation, same reasoning as Event.clientId.
export const updateReportSchema = createReportSchema.omit({ eventId: true }).partial();

export const reportsQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
});
