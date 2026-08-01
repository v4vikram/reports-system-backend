import { describe, expect, it } from "vitest";
import { PERMISSION_CATALOG } from "../../src/constants/permissions.js";
import { getUserAccess } from "../../src/lib/access.js";
import { prisma } from "../../src/lib/prisma.js";
import { createUser } from "../helpers/fixtures.js";

describe("system roles carry zero default permissions (except ADMIN)", () => {
  it("EMPLOYEE role has no attached permissions", async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
      include: { permissions: true },
    });
    expect(role.permissions).toHaveLength(0);
  });

  it("CLIENT role has no attached permissions", async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: "CLIENT" },
      include: { permissions: true },
    });
    expect(role.permissions).toHaveLength(0);
  });

  it("ADMIN role has every permission in the catalog", async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: "ADMIN" },
      include: { permissions: true },
    });
    expect(role.permissions).toHaveLength(PERMISSION_CATALOG.length);
  });
});

describe("getUserAccess", () => {
  it("gives a freshly-created EMPLOYEE zero effective permissions", async () => {
    const { user } = await createUser({ email: "empty-employee@test.local", roleNames: ["EMPLOYEE"] });
    const access = await getUserAccess(user.id);
    expect(access.permissions).toHaveLength(0);
    expect(access.roles.map((r) => r.name)).toEqual(["EMPLOYEE"]);
  });

  it("unions role permissions with direct per-user grants", async () => {
    // A custom role (not EMPLOYEE/CLIENT) carrying its own permissions, plus
    // one extra permission granted directly to the user — effective set
    // should be the union of both, not just one or the other.
    const categoriesRead = await prisma.permission.findUniqueOrThrow({
      where: { key: "categories:read" },
    });
    const customRole = await prisma.role.create({
      data: {
        name: "Custom Reviewer",
        isSystem: false,
        permissions: { create: [{ permissionId: categoriesRead.id }] },
      },
    });

    const { user } = await createUser({
      email: "union-user@test.local",
      permissionKeys: ["reports:read"],
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: customRole.id } });

    const access = await getUserAccess(user.id);
    expect(access.permissions.sort()).toEqual(["categories:read", "reports:read"]);
  });
});
