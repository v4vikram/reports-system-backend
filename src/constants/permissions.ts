// The full catalog of permission keys the system knows about. Seeded into the
// `permissions` table (see prisma/seed.ts) and used by requirePermission().
// Format: "<resource>:<action>". The frontend mirrors the subset it needs in
// each feature's constants.ts — keep the keys identical.
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
  { key: PERMISSIONS.REPORTS_READ, description: "View reports" },
  { key: PERMISSIONS.REPORTS_UPDATE, description: "Update reports" },
  { key: PERMISSIONS.REPORTS_DELETE, description: "Delete reports" },
];

// System roles seeded at migration time. isSystem roles can't be deleted via
// the API. Three roles: ADMIN (full), EMPLOYEE (scoped staff), CLIENT (external
// report viewer).
//
// EMPLOYEE deliberately lacks clients:read-all, so an employee only ever sees
// the clients ASSIGNED to them. To let a specific employee see ALL clients,
// grant them clients:read-all as a direct permission (or via a custom role) —
// the role is the scoped baseline, direct grants extend it.
export const SYSTEM_ROLES: { name: string; description: string; permissions: PermissionKey[] }[] = [
  {
    name: "ADMIN",
    description: "Full access to everything, including user and role management",
    permissions: PERMISSION_CATALOG.map((p) => p.key),
  },
  {
    name: "EMPLOYEE",
    description: "Staff member — manages their assigned clients and reports",
    permissions: [
      PERMISSIONS.CLIENTS_READ,
      PERMISSIONS.CLIENTS_CREATE,
      PERMISSIONS.CLIENTS_UPDATE,
      PERMISSIONS.CLIENTS_DELETE,
      PERMISSIONS.CATEGORIES_READ,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_CREATE,
      PERMISSIONS.REPORTS_UPDATE,
    ],
  },
  {
    name: "CLIENT",
    description: "External client — can view reports only",
    permissions: [PERMISSIONS.REPORTS_READ],
  },
];

// Roles removed from the system-role set; the seed migrates users off these
// to their replacement, then deletes the orphaned role.
export const RETIRED_SYSTEM_ROLES: { name: string; replacement: string }[] = [
  { name: "EDITOR", replacement: "EMPLOYEE" },
  { name: "VIEWER", replacement: "CLIENT" },
];
