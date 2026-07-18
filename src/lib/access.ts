import { prisma } from "./prisma.js";

export interface UserAccess {
  roles: { id: string; name: string }[];
  // Effective permission keys: union of every role's permissions + direct grants.
  permissions: string[];
}

// Single source of truth for "what can this user do". Used by /me (to hand the
// client its permission set) and by requirePermission (to authorize requests).
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      },
      directPermissions: { select: { permission: { select: { key: true } } } },
    },
  });

  if (!user) {
    return { roles: [], permissions: [] };
  }

  const permissionKeys = new Set<string>();
  for (const { role } of user.roles) {
    for (const rp of role.permissions) {
      permissionKeys.add(rp.permission.key);
    }
  }
  for (const dp of user.directPermissions) {
    permissionKeys.add(dp.permission.key);
  }

  return {
    roles: user.roles.map(({ role }) => ({ id: role.id, name: role.name })),
    permissions: [...permissionKeys],
  };
}
