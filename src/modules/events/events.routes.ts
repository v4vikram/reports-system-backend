import { Router } from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./events.controller.js";
import { createEventSchema, eventsQuerySchema, updateEventSchema } from "./events.validation.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth, perUserRateLimit);

// Events carry no permission keys of their own — every route here gates on
// the same clients:* permission that would let the actor manage the parent
// Client; getOwnedClient (via events.service.ts) further scopes which rows.
eventsRouter.get(
  "/",
  requirePermission(PERMISSIONS.CLIENTS_READ),
  validate(eventsQuerySchema, "query"),
  asyncHandler(controller.list)
);

eventsRouter.get("/:id", requirePermission(PERMISSIONS.CLIENTS_READ), asyncHandler(controller.getById));

eventsRouter.post(
  "/",
  requirePermission(PERMISSIONS.CLIENTS_UPDATE),
  validate(createEventSchema),
  asyncHandler(controller.create)
);

eventsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CLIENTS_UPDATE),
  validate(updateEventSchema),
  asyncHandler(controller.update)
);

eventsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.CLIENTS_DELETE),
  asyncHandler(controller.remove)
);
