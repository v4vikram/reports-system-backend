import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./coverageTables.controller.js";
import {
  coverageTablesQuerySchema,
  createCoverageTableSchema,
  updateCoverageTableSchema,
} from "./coverageTables.validation.js";

export const coverageTablesRouter = Router();

coverageTablesRouter.use(requireAuth, perUserRateLimit);

// Coverage tables carry no permission keys of their own — access derives
// from the actor's reports:* grants on the report behind their section.
coverageTablesRouter.get(
  "/",
  requirePermission(PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_READ_ALL),
  validate(coverageTablesQuerySchema, "query"),
  asyncHandler(controller.list)
);

coverageTablesRouter.post(
  "/",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(createCoverageTableSchema),
  asyncHandler(controller.create)
);

coverageTablesRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(updateCoverageTableSchema),
  asyncHandler(controller.update)
);

coverageTablesRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_DELETE),
  asyncHandler(controller.remove)
);
