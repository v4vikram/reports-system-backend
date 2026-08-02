import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(255).nullable().optional(),
  // Permissions granted to this role; defaults to none.
  permissionIds: z.array(z.string().min(1)).default([]),
});
