import { prisma } from "./prisma.js";

export interface UserAccess {
  roles: { id: string; name: string }[];
  // Effective permission keys: union of every role's permissions + direct grants.
  permissions: string[];
  // The Client.id this user is the portal login for, if any. A portal link is
  // a hard ceiling on report visibility (see reports.service.ts) — computed
  // here, alongside permissions, since requirePermission already runs this
  // query on every request; a second round-trip elsewhere would be wasteful.
  portalClientId: string | null;
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
      clientProfile: { select: { id: true } },
    },
  });

  if (!user) {
    return { roles: [], permissions: [], portalClientId: null };
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
    portalClientId: user.clientProfile?.id ?? null,
  };
}
