import type { PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

function isLoopback(connectionString: string): boolean {
  try {
    // Postgres URLs parse as WHATWG URLs; hostname strips any [::1] brackets.
    return LOOPBACK_HOSTS.has(new URL(connectionString).hostname);
  } catch {
    // Unparseable (e.g. a unix-socket or key=value DSN) — treat as local,
    // which is the only place those forms are realistically used.
    return true;
  }
}

// Managed Postgres (Neon, Supabase, RDS) requires TLS; a local dev server or a
// VPS running Postgres on the same box over the loopback interface does not
// and will reject the handshake outright. Deciding by host keeps one config
// working across all three environments, and pg's own `sslmode` URL parsing
// is deliberately not relied on — its historical default silently skipped
// certificate verification, which is worse than either explicit choice.
function resolveSsl(connectionString: string): PoolConfig["ssl"] {
  switch (env.DATABASE_SSL) {
    case "disable":
      return undefined;
    case "require":
      return { rejectUnauthorized: true };
    case "no-verify":
      return { rejectUnauthorized: false };
    case "auto":
      return isLoopback(connectionString) ? undefined : { rejectUnauthorized: true };
  }
}

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // Neon's free tier caps concurrent connections tightly, and its pooled
  // endpoint multiplexes anyway, so a large local pool buys nothing and can
  // exhaust the account's budget across instances.
  max: env.DB_POOL_MAX,
  ssl: resolveSsl(env.DATABASE_URL),
});

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV === "development") {
  global.__prisma = prisma;
}
