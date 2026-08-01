import type { z } from "zod";
import type { loginSchema, registerSchema } from "./auth.validation.js";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface BasicUser {
  id: string;
  name: string;
  email: string;
}

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}
