import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  parentId: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120).optional(),
  parentId: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
