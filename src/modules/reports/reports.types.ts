import type { z } from "zod";
import type { createReportSchema, reportsQuerySchema, updateReportSchema } from "./reports.validation.js";

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

interface BaseCanvasObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TextCanvasObject extends BaseCanvasObject {
  type: "text";
  content: string;
  fontSize: number;
  fontWeight: "normal" | "medium" | "bold";
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
}

export interface ImageCanvasObject extends BaseCanvasObject {
  type: "image";
  src: string | null;
  radius: number;
  opacity: number;
}

export interface ShapeCanvasObject extends BaseCanvasObject {
  type: "shape";
  shapeType: "rectangle" | "ellipse" | "line";
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  radius: number;
}

export type CanvasObject = TextCanvasObject | ImageCanvasObject | ShapeCanvasObject;

export interface CanvasPage {
  id: string;
  width: number;
  height: number;
  background: string;
  objects: CanvasObject[];
}

export interface ReportDto {
  id: string;
  title: string;
  content: string | null;
  clientId: string;
  eventId: string;
  categoryId: string;
  // Report.coverPages Json column, reinterpreted as canvas pages (see
  // reports.validation.ts's coverPageSchema) — same DB column, richer shape.
  coverPages: CanvasPage[];
  createdAt: Date;
  updatedAt: Date;
  // Resolved {id,name} pairs, not flat ids — a portal-linked CLIENT viewer is
  // an expected consumer of "who worked on my report" but should almost
  // never be granted users:read, so they can't resolve ids client-side the
  // way an admin/employee screen resolves assignedUserId via useEmployees().
  assignees: { id: string; name: string }[];
}
