import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).max(50),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string()).max(200),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
