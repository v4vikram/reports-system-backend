import type { z } from "zod";
import type { createClientSchema, updateClientSchema } from "./clients.validation.js";

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
