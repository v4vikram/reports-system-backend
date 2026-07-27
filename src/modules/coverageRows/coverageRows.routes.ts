import { Router } from "express";
import multer from "multer";
import { HttpStatus } from "../../constants/httpStatus.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./coverageRows.controller.js";
import { createCoverageRowSchema, extractFromImageSchema, updateCoverageRowSchema } from "./coverageRows.validation.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Memory storage, not disk — the source screenshot only needs to reach
// Gemini as a buffer for this one request; unlike uploads.routes.ts's
// general image host, it's never served back or referenced afterward, so
// persisting it to disk would just be an orphaned file.
const extractUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ApiError(HttpStatus.BAD_REQUEST, "Only PNG, JPEG, WEBP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const coverageRowsRouter = Router();

coverageRowsRouter.use(requireAuth, perUserRateLimit);

// No GET here — rows are always fetched embedded in their parent coverage
// table (GET /api/coverage-tables), never independently listed.
coverageRowsRouter.post(
  "/",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(createCoverageRowSchema),
  asyncHandler(controller.create)
);

coverageRowsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  validate(updateCoverageRowSchema),
  asyncHandler(controller.update)
);

coverageRowsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.REPORTS_DELETE),
  asyncHandler(controller.remove)
);

coverageRowsRouter.post(
  "/extract-from-image",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  extractUpload.single("file"),
  validate(extractFromImageSchema),
  asyncHandler(controller.extractFromImage)
);
