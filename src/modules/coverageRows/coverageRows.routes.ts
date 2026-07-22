import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./coverageRows.controller.js";
import { createCoverageRowSchema, updateCoverageRowSchema } from "./coverageRows.validation.js";

export const coverageRowsRouter = Router();

coverageRowsRouter.use(requireAuth, perUserRateLimit);

// No GET here — rows are always fetched embedded in their parent coverage
// table (GET /api/coverage-tables), never independently listed.
coverageRowsRouter.post(
  "/",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(createCoverageRowSchema),
  asyncHandler(controller.create)
);

coverageRowsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(updateCoverageRowSchema),
  asyncHandler(controller.update)
);

coverageRowsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_DELETE),
  asyncHandler(controller.remove)
);
