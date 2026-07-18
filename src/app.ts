import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.middlware.js";
import { notFoundHandler } from "./middleware/notFound.middlware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { clientsRouter } from "./modules/clients/clients.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { permissionsRouter } from "./modules/permissions/permissions.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { rolesRouter } from "./modules/roles/roles.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

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

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/reports", reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
