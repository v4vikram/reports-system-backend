// Runs once before the whole test run (not per file): points the DB at
// reports_system_test and brings its schema up to date, then seeds the
// static permission catalog + system roles (reference data every test
// relies on existing, but that's expensive/pointless to reseed per-test).
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + "/..";

export default function setup() {
  config({ path: path.resolve(rootDir, ".env.test"), override: true });

  execSync("npx prisma migrate deploy", {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  execSync("npx tsx prisma/seed.ts", {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });
}
