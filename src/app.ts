import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.middlware.js";
import { notFoundHandler } from "./middleware/notFound.middlware.js";
import { apiRateLimiter } from "./middleware/rateLimiter.middlware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoryRouter } from "./modules/category/category.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

app.use(apiRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV });
});

app.use("/api/auth", authRouter);
app.use("/api/categories", categoryRouter);

// Further feature routes get mounted here as they're built, e.g.:
// app.use("/api/reports", reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
