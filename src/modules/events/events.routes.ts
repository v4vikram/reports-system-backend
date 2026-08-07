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

// Events carry their own permission keys (events:create/read/update/delete),
// but row-level visibility is still inherited entirely from the parent
// Client — getOwnedClient (via events.service.ts) is what actually decides
// *which* events a given actor's grant lets them touch, same as it always
// has. Holding events:read without clients:read-all still only surfaces
// events under clients you're assigned to or the portal login for.
eventsRouter.get(
  "/",
  requirePermission(PERMISSIONS.EVENTS_READ),
  validate(eventsQuerySchema, "query"),
  asyncHandler(controller.list)
);

eventsRouter.get("/:id", requirePermission(PERMISSIONS.EVENTS_READ), asyncHandler(controller.getById));

eventsRouter.post(
  "/",
  requirePermission(PERMISSIONS.EVENTS_CREATE),
  validate(createEventSchema),
  asyncHandler(controller.create)
);

eventsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.EVENTS_UPDATE),
  validate(updateEventSchema),
  asyncHandler(controller.update)
);

eventsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.EVENTS_DELETE),
  asyncHandler(controller.remove)
);
