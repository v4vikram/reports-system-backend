export const PERMISSIONS = {
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  ROLES_MANAGE: "roles:manage",
  CATEGORIES_MANAGE: "categories:manage",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_UPDATE: "clients:update",
  CLIENTS_DELETE: "clients:delete",
  CLIENTS_VIEW_ALL: "clients:view-all",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Any of these being present is enough to view the employee directory —
// there's no separate "view" permission; if you can act on employees at
// all, you can see them.
export const USER_VIEW_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_DELETE,
];
