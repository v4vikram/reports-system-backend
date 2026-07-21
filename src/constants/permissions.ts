// The full catalog of permission keys the system knows about. Seeded into the
// `permissions` table (see prisma/seed.ts) and used by requirePermission().
// Format: "<resource>:<action>". After editing this file, run
// `npm run sync:permissions` to regenerate frontend/src/lib/generated/permissions.ts
// — each feature's constants.ts imports its subset from there instead of
// re-declaring string literals, so a rename/removal here fails the frontend
// build instead of silently leaving a stale permission check.
export const PERMISSIONS = {
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",

  CLIENTS_READ: "clients:read",
  // Scope grant: see/manage ALL clients rather than only assigned ones.
  CLIENTS_READ_ALL: "clients:read-all",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_UPDATE: "clients:update",
  CLIENTS_DELETE: "clients:delete",

  CATEGORIES_READ: "categories:read",
  CATEGORIES_MANAGE: "categories:manage",

  REPORTS_CREATE: "reports:create",
  REPORTS_READ: "reports:read",
  // Scope grant: see every report, not just ones you're assigned to.
  REPORTS_READ_ALL: "reports:read-all",
  REPORTS_UPDATE: "reports:update",
  REPORTS_DELETE: "reports:delete",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDef {
  key: PermissionKey;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: PERMISSIONS.USERS_CREATE, description: "Create user accounts" },
  { key: PERMISSIONS.USERS_READ, description: "View the user directory" },
  { key: PERMISSIONS.USERS_UPDATE, description: "Update users, roles, and permissions" },
  { key: PERMISSIONS.USERS_DELETE, description: "Delete user accounts" },
  { key: PERMISSIONS.CLIENTS_READ, description: "View clients assigned to you" },
  { key: PERMISSIONS.CLIENTS_READ_ALL, description: "View and manage all clients (not just assigned)" },
  { key: PERMISSIONS.CLIENTS_CREATE, description: "Create clients" },
  { key: PERMISSIONS.CLIENTS_UPDATE, description: "Update clients" },
  { key: PERMISSIONS.CLIENTS_DELETE, description: "Delete clients" },
  { key: PERMISSIONS.CATEGORIES_READ, description: "View categories" },
  { key: PERMISSIONS.CATEGORIES_MANAGE, description: "Create, update, and delete categories" },
  { key: PERMISSIONS.REPORTS_CREATE, description: "Create reports" },
  { key: PERMISSIONS.REPORTS_READ, description: "View reports assigned to you" },
  { key: PERMISSIONS.REPORTS_READ_ALL, description: "View all reports (not just assigned)" },
  { key: PERMISSIONS.REPORTS_UPDATE, description: "Update reports" },
  { key: PERMISSIONS.REPORTS_DELETE, description: "Delete reports" },
];

// System roles seeded at migration time. isSystem roles can't be deleted via
// the API. Three roles: ADMIN (full), EMPLOYEE (staff), CLIENT (external
// report viewer).
//
// Only ADMIN carries built-in permissions. EMPLOYEE and CLIENT are deliberately
// seeded with ZERO permissions — a role here means "what kind of account this
// is," not "what it can do." Creating an employee/client grants no module
// access by default; an admin must explicitly grant permissions per user
// (direct grants) or via a custom role (see the `roles` module) before they
// can see or touch anything beyond the dashboard shell. Re-running the seed
// resets EMPLOYEE/CLIENT back to empty, so don't rely on editing this array
// as a way to grant standing access to every employee/client — use direct
// grants or a custom role instead.
export const SYSTEM_ROLES: { name: string; description: string; permissions: PermissionKey[] }[] = [
  {
    name: "ADMIN",
    description: "Full access to everything, including user and role management",
    permissions: PERMISSION_CATALOG.map((p) => p.key),
  },
  {
    name: "EMPLOYEE",
    description: "Staff member — no access by default; permissions are granted individually",
    permissions: [],
  },
  {
    name: "CLIENT",
    description: "External client — no access by default; permissions are granted individually",
    permissions: [],
  },
];

// Roles removed from the system-role set; the seed migrates users off these
// to their replacement, then deletes the orphaned role.
export const RETIRED_SYSTEM_ROLES: { name: string; replacement: string }[] = [
  { name: "EDITOR", replacement: "EMPLOYEE" },
  { name: "VIEWER", replacement: "CLIENT" },
];
