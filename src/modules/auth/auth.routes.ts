import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middlware.js";
import { validate } from "../../middleware/validate.middlware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(controller.register));
authRouter.post("/login", validate(loginSchema), asyncHandler(controller.login));
authRouter.post("/refresh", asyncHandler(controller.refresh));
authRouter.post("/logout", asyncHandler(controller.logout));
authRouter.get("/me", requireAuth, asyncHandler(controller.me));
