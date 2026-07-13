import { Router } from "express";
import { requireAnyPermission, requireAuth } from "../../middleware/auth.middlware.js";
import { USER_VIEW_PERMISSIONS } from "../../constants/index.js";
import * as userController from "./user.controller.js";

// Read-only for now — lists existing roles so the user module's role
// picker has data. Creating/editing roles (and their permissions) is a
// separate, deliberately deferred module; see docs/architecture/erd.md.
export const roleRouter = Router();

roleRouter.get(
  "/",
  requireAuth,
  requireAnyPermission(USER_VIEW_PERMISSIONS),
  userController.listRoles
);
