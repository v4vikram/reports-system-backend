import { Router } from "express";
import { requireAnyPermission, requireAuth } from "../../middleware/auth.middlware.js";
import { USER_VIEW_PERMISSIONS } from "../../constants/index.js";
import * as userController from "./user.controller.js";

// Read-only — lists every permission in the catalog so the employee
// management UI's direct-grant checkbox list has data. There's no
// create/edit here: the permission catalog itself is code-defined (see
// constants/permissions.ts), not admin-editable.
export const permissionRouter = Router();

permissionRouter.get(
  "/",
  requireAuth,
  requireAnyPermission(USER_VIEW_PERMISSIONS),
  userController.listPermissions
);
