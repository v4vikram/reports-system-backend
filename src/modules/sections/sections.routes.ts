import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./sections.controller.js";
import { createSectionSchema, sectionsQuerySchema, updateSectionSchema } from "./sections.validation.js";

export const sectionsRouter = Router();

sectionsRouter.use(requireAuth, perUserRateLimit);

// Sections carry no permission keys of their own — access is entirely
// derived from whatever reports:* grants the actor already has for the
// parent report (same pattern as Event under Client).
sectionsRouter.get(
  "/",
  requirePermission(PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_READ_ALL),
  validate(sectionsQuerySchema, "query"),
  asyncHandler(controller.list)
);

sectionsRouter.post(
  "/",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(createSectionSchema),
  asyncHandler(controller.create)
);

sectionsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(updateSectionSchema),
  asyncHandler(controller.update)
);

sectionsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_DELETE),
  asyncHandler(controller.remove)
);
