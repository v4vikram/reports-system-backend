// Consumed by the Prisma CLI (migrate/studio/generate) — NOT by the running
// app, which builds its own client in src/lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

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
    // the lock is dropped the moment it's taken and DDL can fail or interleave.
    // On plain Postgres (local dev, VPS) DIRECT_DATABASE_URL is unset and this
    // is just DATABASE_URL — same behaviour as before.
    url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"],
  },
});
