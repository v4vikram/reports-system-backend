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

// A canvas page's objects, discriminated by `type`. Shared x/y/width/height/
// rotation/zIndex placement fields, then per-type visual props. This is a
// document format (like CoverageTable.screenshots), not a relational
// resource — an object gets replaced wholesale with its page on every save,
// never addressed by its own endpoint, since canvas edits (drag/resize) fire
// far too often for one REST call per field the way CoverageRow fields do.
const baseCanvasObjectSchema = {
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  rotation: z.number().default(0),
  zIndex: z.number().int().default(0),
};

const textObjectSchema = z.object({
  ...baseCanvasObjectSchema,
  type: z.literal("text"),
  content: z.string().max(5000).default(""),
  fontSize: z.number().min(1).default(16),
  fontWeight: z.enum(["normal", "medium", "bold"]).default("normal"),
  color: z.string().default("#000000"),
  align: z.enum(["left", "center", "right"]).default("left"),
  letterSpacing: z.number().default(0),
});

const imageObjectSchema = z.object({
  ...baseCanvasObjectSchema,
  type: z.literal("image"),
  src: z.string().max(2000).nullable().default(null),
  radius: z.number().min(0).default(0),
  opacity: z.number().min(0).max(1).default(1),
});

const shapeObjectSchema = z.object({
  ...baseCanvasObjectSchema,
  type: z.literal("shape"),
  shapeType: z.enum(["rectangle", "ellipse", "line"]).default("rectangle"),
  fill: z.string().nullable().default("#3b82f6"),
  stroke: z.string().nullable().default(null),
  strokeWidth: z.number().min(0).default(0),
  radius: z.number().min(0).default(0),
});

const canvasObjectSchema = z.discriminatedUnion("type", [
  textObjectSchema,
  imageObjectSchema,
  shapeObjectSchema,
]);

// 794x1123 = A4 at 96dpi, the same convention the reference editor used.
const coverPageSchema = z.object({
  id: z.string().min(1),
  width: z.number().min(1).default(794),
  height: z.number().min(1).default(1123),
  background: z.string().default("#ffffff"),
  objects: z.array(canvasObjectSchema).default([]),
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
