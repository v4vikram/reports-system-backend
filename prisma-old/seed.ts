import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  PERMISSION_CATALOG,
  RETIRED_SYSTEM_ROLES,
  SYSTEM_ROLES,
} from "../src/constants/permissions.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "v4vikram.dev@gmail.com";

async function main() {
  // 1. Permissions catalog (idempotent upsert by key).
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: { key: perm.key, description: perm.description },
    });
  }
  console.log(`Seeded ${PERMISSION_CATALOG.length} permissions`);

  // 2. System roles + their permission sets.
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: true },
      create: { name: roleDef.name, description: roleDef.description, isSystem: true },
    });

    const permissions = await prisma.permission.findMany({
      where: { key: { in: roleDef.permissions } },
      select: { id: true },
    });

    // Reset the role's permission set to exactly what the catalog declares.
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      }),
    ]);
  }
  console.log(`Seeded ${SYSTEM_ROLES.length} system roles: ${SYSTEM_ROLES.map((r) => r.name).join(", ")}`);

  // 2b. Migrate users off any retired system roles, then delete those roles.
  for (const retired of RETIRED_SYSTEM_ROLES) {
    const oldRole = await prisma.role.findUnique({ where: { name: retired.name } });
    if (!oldRole) continue;

    const replacement = await prisma.role.findUnique({ where: { name: retired.replacement } });
    if (replacement) {
      const memberships = await prisma.userRole.findMany({ where: { roleId: oldRole.id } });
      for (const m of memberships) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: m.userId, roleId: replacement.id } },
          update: {},
          create: { userId: m.userId, roleId: replacement.id },
        });
      }
      if (memberships.length > 0) {
        console.log(
          `Migrated ${memberships.length} user(s) from ${retired.name} to ${retired.replacement}`
        );
      }
    }

    // UserRole/RolePermission rows cascade on role delete.
    await prisma.role.delete({ where: { id: oldRole.id } });
    console.log(`Removed retired role: ${retired.name}`);
  }

  // 3. Admin user. Existing admin's password/status is never overwritten by
  //    re-seeding (update: {}), so this is safe to run repeatedly.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is not set. Add it to backend/.env before seeding the admin user."
    );
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: "Vikram",
      email: ADMIN_EMAIL,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  // Ensure the admin has the ADMIN role (idempotent).
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`Seeded admin user: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
