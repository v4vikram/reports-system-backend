import type { z } from "zod";
import type {
  assignPermissionsSchema,
  assignRolesSchema,
  createUserSchema,
  updateUserSchema,
} from "./users.validation.js";

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;

// The Employee DTO the frontend consumes. isActive is derived from the user's
// status; directPermissions are only the direct grants (not effective set).
export interface EmployeeDto {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  roles: { id: string; name: string }[];
  directPermissions: string[];
}
