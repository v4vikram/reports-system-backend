import { z } from "zod";

// Mirrors frontend/src/features/client/validation.ts. Nullable (not optional)
// fields match the form, which always sends the key with an explicit null.
export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  company: z.string().max(160).nullable().default(null),
  email: z.string().email("Invalid email address").nullable().default(null),
  phone: z.string().max(40).nullable().default(null),
  address: z.string().max(500).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
  assignedUserId: z.string().min(1).nullable().default(null),
  portalUserId: z.string().min(1).nullable().default(null),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const clientIdParamSchema = z.object({
  id: z.string().min(1),
});
