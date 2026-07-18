import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  // Optional so an admin can grant access at creation time; both default to
  // empty (a user with no roles/permissions can log in but can do nothing).
  roleIds: z.array(z.string().min(1)).default([]),
  permissionIds: z.array(z.string().min(1)).default([]),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1)),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});
