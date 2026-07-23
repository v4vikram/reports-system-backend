import type { z } from "zod";
import type { createReportSchema, reportsQuerySchema, updateReportSchema } from "./reports.validation.js";

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

export interface CoverPage {
  content: string | null;
  image: string | null;
}

export interface ReportDto {
  id: string;
  title: string;
  content: string | null;
  clientId: string;
  eventId: string;
  categoryId: string;
  coverPages: CoverPage[];
  createdAt: Date;
  updatedAt: Date;
  // Resolved {id,name} pairs, not flat ids — a portal-linked CLIENT viewer is
  // an expected consumer of "who worked on my report" but should almost
  // never be granted users:read, so they can't resolve ids client-side the
  // way an admin/employee screen resolves assignedUserId via useEmployees().
  assignees: { id: string; name: string }[];
}
