import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "../src/constants/permissions.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const permissionKeys = Object.values(PERMISSIONS);

  // Keeps the DB's permission catalog in sync with the code-defined one —
  // a key removed/renamed here (e.g. the users:manage/clients:manage split)
  // stops being just an addition and actually disappears, along with any
  // RolePermission/UserPermission grants that pointed at it (cascade).
  const pruned = await prisma.permission.deleteMany({
    where: { key: { notIn: permissionKeys } },
  });
  if (pruned.count > 0) {
    console.log(`Pruned ${pruned.count} stale permission(s) no longer in the catalog.`);
  }

  await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      })
    )
  );

  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Full access to all permissions. Cannot be deleted.",
      isSystem: true,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      })
    )
  );

  console.log(
    `Seeded ${permissionKeys.length} permission(s) and the "Admin" role with full access.`
  );

  // Change SEED_ADMIN_EMAIL in .env and re-run this seed to promote a
  // different (already-registered) account instead — no code change needed.
  const adminEmail = process.env.SEED_ADMIN_EMAIL;

  if (!adminEmail) {
    console.log("SEED_ADMIN_EMAIL not set — skipping admin assignment.");
  } else {
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!adminUser) {
      console.warn(
        `No user found with email "${adminEmail}" — skipping admin assignment. ` +
          "Register that account first, then re-run this seed."
      );
    } else {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
        update: {},
        create: { userId: adminUser.id, roleId: adminRole.id },
      });
      console.log(`Assigned the "Admin" role to ${adminEmail}.`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
