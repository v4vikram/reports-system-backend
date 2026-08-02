import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from "../../config/uploads.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireAuth, requirePermission } from "../../middleware/auth.middlware.js";
import { perUserRateLimit } from "../../middleware/rateLimit.middlware.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    // Never trust the original filename — path traversal / collisions.
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ApiError(HttpStatus.BAD_REQUEST, "Only PNG, JPEG, WEBP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, perUserRateLimit);

// Gated on reports:update — this exists specifically to attach images to
// report content (coverage-row clippings, table screenshots), not as a
// general-purpose file host. Stores to local disk (see config/uploads.ts),
// served back via the /uploads static mount in app.ts.
uploadsRouter.post(
  "/image",
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(HttpStatus.BAD_REQUEST, "No file uploaded");
    const url = `${UPLOADS_URL_PREFIX}/${req.file.filename}`;
    res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, { url }, "Image uploaded"));
  })
);
