import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "../src/constants/permissions.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const permissionKeys = Object.values(PERMISSIONS);

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
