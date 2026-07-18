import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./users.controller.js";
import {
  assignPermissionsSchema,
  assignRolesSchema,
  createUserSchema,
  updateUserSchema,
} from "./users.validation.js";

export const usersRouter = Router();

// Everything here requires a logged-in user with the relevant users:* grant.
usersRouter.use(requireAuth);

usersRouter.get("/", requirePermission(PERMISSIONS.USERS_READ), asyncHandler(controller.list));

usersRouter.post(
  "/",
  requirePermission(PERMISSIONS.USERS_CREATE),
  validate(createUserSchema),
  asyncHandler(controller.create)
);

usersRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(updateUserSchema),
  asyncHandler(controller.update)
);

usersRouter.delete("/:id", requirePermission(PERMISSIONS.USERS_DELETE), asyncHandler(controller.remove));

usersRouter.put(
  "/:id/roles",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(assignRolesSchema),
  asyncHandler(controller.assignRoles)
);

usersRouter.put(
  "/:id/permissions",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(assignPermissionsSchema),
  asyncHandler(controller.assignPermissions)
);
