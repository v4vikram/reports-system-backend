import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listPermissions } from "./permissions.controller.js";

export const permissionsRouter = Router();

// Only people who can manage users need the permission catalog (to assign it).
permissionsRouter.get(
  "/",
  requireAuth,
  perUserRateLimit,
  requirePermission(PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE),
  asyncHandler(listPermissions)
);
