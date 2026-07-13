import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middlware.js";
import { authRateLimiter } from "../../middleware/rateLimiter.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import * as authController from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate(registerSchema), authController.register);
authRouter.post("/login", authRateLimiter, validate(loginSchema), authController.login);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
