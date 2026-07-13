import { Router } from "express";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { PERMISSIONS } from "../../constants/index.js";
import * as categoryController from "./category.controller.js";
import { createCategorySchema, updateCategorySchema } from "./category.validation.js";

export const categoryRouter = Router();

categoryRouter.use(requireAuth);

categoryRouter.get("/", categoryController.list);
categoryRouter.post(
  "/",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(createCategorySchema),
  categoryController.create
);
categoryRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(updateCategorySchema),
  categoryController.update
);
categoryRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  categoryController.remove
);
