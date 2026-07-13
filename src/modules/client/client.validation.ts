import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  company: z.string().max(160).nullable().optional(),
  email: z.email("Invalid email address").nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
