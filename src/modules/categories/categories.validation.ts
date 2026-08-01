import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  parentId: z.string().min(1).nullable().default(null),
  description: z.string().max(500).nullable().default(null),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});
