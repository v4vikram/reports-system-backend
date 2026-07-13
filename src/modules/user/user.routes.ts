import { Router } from "express";
import { requireAnyPermission, requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { PERMISSIONS, USER_VIEW_PERMISSIONS } from "../../constants/index.js";
import * as userController from "./user.controller.js";
import {
  assignPermissionsSchema,
  assignRolesSchema,
  createUserSchema,
  updateUserSchema,
} from "./user.validation.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/", requireAnyPermission(USER_VIEW_PERMISSIONS), userController.list);
userRouter.get("/:id", requireAnyPermission(USER_VIEW_PERMISSIONS), userController.getOne);
userRouter.post(
  "/",
  requirePermission(PERMISSIONS.USERS_CREATE),
  validate(createUserSchema),
  userController.create
);
userRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(updateUserSchema),
  userController.update
);
userRouter.delete("/:id", requirePermission(PERMISSIONS.USERS_DELETE), userController.remove);
userRouter.put(
  "/:id/roles",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(assignRolesSchema),
  userController.assignRoles
);
userRouter.put(
  "/:id/permissions",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(assignPermissionsSchema),
  userController.assignPermissions
);
