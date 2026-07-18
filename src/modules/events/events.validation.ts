import { z } from "zod";

export const createEventSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(160),
  description: z.string().max(2000).nullable().default(null),
  eventDate: z.coerce.date().nullable().default(null),
});

// clientId is immutable after creation — a report's client is always derived
// from its event, so there's no path where an event's client can change out
// from under reports that already reference it.
export const updateEventSchema = createEventSchema
  .omit({ clientId: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const eventsQuerySchema = z.object({
  clientId: z.string().min(1),
});
