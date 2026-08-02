import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// backend/ — two levels up from src/config, and from dist/config after a build.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Loads exactly ONE env file, chosen by NODE_ENV:
 *
 *   NODE_ENV=development (or unset) -> .env.development
 *   NODE_ENV=test                   -> .env.test
 *   NODE_ENV=production             -> .env.production
 *   ...falling back to plain .env when the specific file doesn't exist.
 *
 * Deliberately NOT a cascade. The usual `.env.<mode>` then `.env` chain is
 * dangerous here because `.env` holds the *production* config (Neon, live
 * SMTP): any key missing from `.env.development` would silently fall through
 * to a production value, and pointing local dev at the live database is
 * exactly the failure this is meant to prevent.
 *
 * Real environment variables always win — dotenv never overwrites an existing
 * process.env entry — so platform-injected config (Render, CI) takes
 * precedence and no env file needs to be deployed at all.
 */
export function loadEnvFile(): void {
  const mode = process.env.NODE_ENV ?? "development";
  const candidates = [`.env.${mode}`, ".env"];

  for (const name of candidates) {
    const file = path.join(rootDir, name);
    if (!fs.existsSync(file)) continue;
    config({ path: file });
    return;
  }
}

loadEnvFile();
