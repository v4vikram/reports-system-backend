import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./reports.controller.js";
import { createReportSchema, reportsQuerySchema, updateReportSchema } from "./reports.validation.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, perUserRateLimit);

// Deliberately OR'd (unlike clients.routes.ts's list gate, which only checks
// the base *_READ key) so holding only reports:read-all doesn't 403 at the
// door — requirePermission's OR semantics exist exactly for this.
reportsRouter.get(
  "/",
  requirePermission(PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_READ_ALL),
  validate(reportsQuerySchema, "query"),
  asyncHandler(controller.list)
);

reportsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_READ_ALL),
  asyncHandler(controller.getById)
);

// Exports whatever the requester can already view — same visibility gate as
// getById, not a separate permission. Sits above perUserRateLimit's default
// window without its own carve-out; rendering a PDF is heavier than a normal
// request but not something a legitimate user does often enough to need one.
reportsRouter.get(
  "/:id/export.pdf",
  requirePermission(PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_READ_ALL),
  asyncHandler(controller.exportPdf)
);

reportsRouter.post(
  "/",
  requirePermission(PERMISSIONS.REPORTS_CREATE),
  validate(createReportSchema),
  asyncHandler(controller.create)
);

reportsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(updateReportSchema),
  asyncHandler(controller.update)
);

reportsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_DELETE),
  asyncHandler(controller.remove)
);
