// Must come before anything reads process.env — picks the right .env file for
// this NODE_ENV. See load-env.ts for why it is not a cascade.
import "./load-env.js";
import { z } from "zod";

// Env vars arrive as strings; accept the usual spellings of a boolean rather
// than forcing exactly "true". `undefined` is preserved so callers can tell
// "unset" from "explicitly false" and apply their own default.
const optionalBoolean = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true" || v === "1" || v === "yes"));

const booleanWithDefault = (fallback: boolean) =>
  optionalBoolean.transform((v) => v ?? fallback);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Neon (and any PgBouncer-fronted Postgres) exposes two endpoints: a
    // pooled one for the app and a direct one for DDL. `prisma migrate` takes
    // session-level advisory locks, which a transaction-pooling proxy cannot
    // hold across statements, so migrations must use the direct endpoint.
    // Unset on plain Postgres (local/VPS) — falls back to DATABASE_URL.
    DIRECT_DATABASE_URL: z.string().min(1).optional(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    // Overrides the host-based default (off for localhost, verified TLS for
    // anything remote). "no-verify" is the escape hatch for a self-signed
    // certificate on a VPS; it encrypts but does not authenticate the server.
    DATABASE_SSL: z.enum(["auto", "require", "no-verify", "disable"]).default("auto"),
    // Run `prisma migrate deploy` + reference-data seeding at boot. Off by
    // default so local dev keeps its explicit `npm run db:migrate` workflow;
    // turned on for platform deploys (Render) that have no shell step.
    DB_AUTO_MIGRATE: booleanWithDefault(false),
    DB_AUTO_SEED: booleanWithDefault(false),

    JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
    JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // Comma-separated: a deploy may need to allow both a stable frontend URL
    // and a preview URL. The first entry is treated as the canonical public
    // frontend origin (used to build password-reset links).
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    // Cross-site cookies (frontend and backend on different registrable
    // domains, e.g. Vercel + Render) require SameSite=None, which browsers
    // only honour alongside Secure. Same-domain deploys keep the safer Lax.
    COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
    COOKIE_SECURE: optionalBoolean,
    // Passed to Express's `trust proxy`. Needed behind a platform load
    // balancer or nginx so req.protocol/req.ip are the client's, not the
    // proxy's — which secure cookies and IP rate limiting both depend on.
    TRUST_PROXY: z.string().optional(),
    // express.json's default is 100kb; the canvas editor autosaves multi-page
    // documents that can exceed it.
    BODY_LIMIT: z.string().default("1mb"),

    STORAGE_DRIVER: z.enum(["local", "cloudinary"]).default("local"),
    // Absolute path override for the local driver. Unset means the in-repo
    // backend/uploads directory (see config/uploads.ts). On a VPS point this
    // at persistent, backed-up storage outside the deploy directory.
    UPLOADS_DIR: z.string().min(1).optional(),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(10),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    CLOUDINARY_FOLDER: z.string().min(1).default("reports-system"),
    // Absolute origin this API is reachable at. Only needed when something
    // must build absolute URLs without an incoming request to read the Host
    // header from; PDF export falls back to the request's own origin.
    PUBLIC_BASE_URL: z.url().optional(),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // Consumed only by the reference-data seed (lib/bootstrap/seed.ts).
    SEED_ADMIN_EMAIL: z.email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(1).optional(),

    // Optional, not required: the "Auto-Fill from Image" coverage-row
    // extraction feature degrades to a clear 503 (see coverageRows.service.ts)
    // rather than crashing the whole server on boot when it's unset.
    GEMINI_API_KEY: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER === "cloudinary") {
      for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=cloudinary`,
          });
        }
      }
    }

    const secure = value.COOKIE_SECURE ?? value.NODE_ENV === "production";
    if (value.COOKIE_SAMESITE === "none" && !secure) {
      ctx.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message:
          "COOKIE_SAMESITE=none requires COOKIE_SECURE=true — browsers reject SameSite=None cookies without the Secure attribute",
      });
    }
  })
  .transform((value) => ({
    ...value,
    // Resolved here rather than via .default() because the fallback depends
    // on NODE_ENV, which is itself part of this schema.
    COOKIE_SECURE: value.COOKIE_SECURE ?? value.NODE_ENV === "production",
    // Migrations target the direct endpoint; everything else the pooled one.
    DIRECT_DATABASE_URL: value.DIRECT_DATABASE_URL ?? value.DATABASE_URL,
    CORS_ORIGINS: value.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
