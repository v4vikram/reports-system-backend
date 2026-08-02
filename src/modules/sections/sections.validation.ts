import { z } from "zod";

export const createSectionSchema = z.object({
  reportId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(160),
  // Export heading; falls back to `name` downstream when omitted.
  title: z.string().max(160).nullish(),
  type: z.enum(["standard", "custom"]).default("standard"),
  // Only meaningful for `custom` sections — a standard section's body comes
  // from its coverage tables, not these fields.
  content: z.string().nullish(),
  image: z.string().nullish(),
  order: z.number().int().min(0).default(0),
});

// reportId is immutable after creation, same reasoning as Event.clientId /
// Report.eventId — a section's report is never accepted as independent input.
//
// `type` and `order` are re-declared without their create-time defaults rather
// than inherited: `.partial()` makes a key optional but does NOT strip its
// default, so a defaulted key is still *populated* when absent. Inheriting
// them would make `PATCH {name}` also send type=standard and order=0 —
// silently flipping a custom section back to standard and resetting its
// position on every rename.
export const updateSectionSchema = createSectionSchema
  .omit({ reportId: true, type: true, order: true })
  .partial()
  .extend({
    type: z.enum(["standard", "custom"]).optional(),
    order: z.number().int().min(0).optional(),
  });

export const sectionsQuerySchema = z.object({
  reportId: z.string().min(1),
});
