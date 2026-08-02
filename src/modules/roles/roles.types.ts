import type { z } from "zod";
import type { createRoleSchema } from "./roles.validation.js";

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
