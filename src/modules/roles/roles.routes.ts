import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./roles.controller.js";
import { createRoleSchema } from "./roles.validation.js";

export const rolesRouter = Router();

rolesRouter.use(requireAuth, perUserRateLimit);

rolesRouter.get(
  "/",
  requirePermission(PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE),
  asyncHandler(controller.list)
);

// Creating roles is an admin-level action, gated on users:create.
rolesRouter.post(
  "/",
  requirePermission(PERMISSIONS.USERS_CREATE),
  validate(createRoleSchema),
  asyncHandler(controller.create)
);
