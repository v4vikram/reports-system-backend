import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local disk storage, not object storage (S3/Cloudinary/etc.) — this app
// deploys to a single VPS the user controls, so files live on that same
// host. Keep this directory on persistent/backed-up storage in production;
// it won't survive a container rebuild or multi-instance deploy as-is.
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
export const UPLOADS_URL_PREFIX = "/uploads";
