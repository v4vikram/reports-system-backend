import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./categories.controller.js";
import { createCategorySchema, updateCategorySchema } from "./categories.validation.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth, perUserRateLimit);

// Viewing needs categories:read; mutating needs categories:manage.
categoriesRouter.get("/", requirePermission(PERMISSIONS.CATEGORIES_READ), asyncHandler(controller.list));

categoriesRouter.post(
  "/",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(createCategorySchema),
  asyncHandler(controller.create)
);

categoriesRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(updateCategorySchema),
  asyncHandler(controller.update)
);

categoriesRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  asyncHandler(controller.remove)
);
