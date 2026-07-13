import { Router } from "express";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { PERMISSIONS } from "../../constants/index.js";
import * as clientController from "./client.controller.js";
import { createClientSchema, updateClientSchema } from "./client.validation.js";

export const clientRouter = Router();

clientRouter.use(requireAuth);

clientRouter.get("/", clientController.list);
clientRouter.get("/:id", clientController.getOne);
clientRouter.post(
  "/",
  requirePermission(PERMISSIONS.CLIENTS_CREATE),
  validate(createClientSchema),
  clientController.create
);
clientRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CLIENTS_UPDATE),
  validate(updateClientSchema),
  clientController.update
);
clientRouter.delete("/:id", requirePermission(PERMISSIONS.CLIENTS_DELETE), clientController.remove);
