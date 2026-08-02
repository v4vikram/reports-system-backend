// Runs before each test file: points this file's module graph at the test
// DB (must happen before anything imports src/config/env.ts, which reads
// process.env once at import time), then wipes per-test data between tests
// so no test can see fixtures left behind by another.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { beforeEach } from "vitest";
import { resetDb } from "./helpers/db.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + "/..";
config({ path: path.resolve(rootDir, ".env.test"), override: true });

beforeEach(async () => {
  await resetDb();
});
