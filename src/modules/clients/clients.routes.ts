import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./clients.controller.js";
import { createClientSchema, updateClientSchema } from "./clients.validation.js";

export const clientsRouter = Router();

clientsRouter.use(requireAuth, perUserRateLimit);

clientsRouter.get("/", requirePermission(PERMISSIONS.CLIENTS_READ), asyncHandler(controller.list));

clientsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.CLIENTS_READ),
  asyncHandler(controller.getById)
);

clientsRouter.post(
  "/",
  requirePermission(PERMISSIONS.CLIENTS_CREATE),
  validate(createClientSchema),
  asyncHandler(controller.create)
);

clientsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CLIENTS_UPDATE),
  validate(updateClientSchema),
  asyncHandler(controller.update)
);

clientsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.CLIENTS_DELETE),
  asyncHandler(controller.remove)
);
