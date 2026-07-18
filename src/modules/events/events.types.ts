import type { z } from "zod";
import type { createEventSchema, eventsQuerySchema, updateEventSchema } from "./events.validation.js";

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventsQuery = z.infer<typeof eventsQuerySchema>;
