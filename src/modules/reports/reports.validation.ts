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

const coverPageSchema = z.object({
  content: z.string().max(20000).nullable().default(null),
  image: z.string().max(2000).nullable().default(null),
});

// eventId is immutable after creation, same reasoning as Event.clientId.
//
// `content` and `assigneeUserIds` are re-declared without their create-time
// defaults rather than inherited via omit/partial: `.partial()` makes a key
// optional but does NOT strip its `.default()`, so a defaulted key is still
// *populated* when absent from the input. Inheriting them here would mean
// `PATCH {title}` also sends content=null and assigneeUserIds=[] — silently
// wiping a report's content and unassigning every employee on every rename.
// (Currently masked because the only caller, ReportFormDialog, always
// submits the full form — but that's the update schema being bailed out by
// one caller's habits, not a guarantee. Same trap fixed the same way in
// sections.validation.ts.)
//
// coverPages is only reachable via update, never create — a report can't
// have a cover page before it exists, matching the editor UI ("save the
// report first").
export const updateReportSchema = createReportSchema
  .omit({ eventId: true, content: true, assigneeUserIds: true })
  .partial()
  .extend({
    content: z.string().max(20000).nullable().optional(),
    assigneeUserIds: z.array(z.string().min(1)).optional(),
    // Full-replace-the-set semantics, same convention as CoverageTable.screenshots.
    coverPages: z.array(coverPageSchema).optional(),
  });

export const reportsQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
});
