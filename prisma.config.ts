// Consumed by the Prisma CLI (migrate/studio/generate) — NOT by the running
// app, which builds its own client in src/lib/prisma.ts.
import fs from "node:fs";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Mirrors src/config/load-env.ts: load exactly one env file, chosen by
// NODE_ENV, so `prisma migrate` targets the same database the app would.
// Inlined rather than imported because the Prisma CLI loads this file with its
// own TypeScript loader and resolving into src/ from here is fragile.
const mode = process.env["NODE_ENV"] ?? "development";
for (const file of [`.env.${mode}`, ".env"]) {
  if (fs.existsSync(file)) {
    config({ path: file });
    break;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations deliberately use the DIRECT (non-pooled) endpoint when one is
    // configured. `prisma migrate` serialises itself with a session-level
    // Postgres advisory lock, and a transaction-pooling proxy like Neon's
    // PgBouncer endpoint hands each statement a different backend session, so
    // the lock is dropped the moment it's taken and DDL can hang or fail —
    // the "Timed out trying to acquire a postgres advisory lock" error.
    // On plain Postgres (local dev, VPS) DIRECT_DATABASE_URL is unset and this
    // is just DATABASE_URL.
    url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"],
  },
});
