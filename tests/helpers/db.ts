import { prisma } from "../../src/lib/prisma.js";

// The static catalog (seeded once in global-setup) — never truncated between
// tests, since it's reference data, not per-test fixtures.
const CATALOG_TABLES = new Set(["permissions", "roles", "role_permissions"]);

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  const toTruncate = tables.map((t) => t.tablename).filter((name) => !CATALOG_TABLES.has(name));
  if (toTruncate.length > 0) {
    const quoted = toTruncate.map((name) => `"${name}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  }

  // roles/role_permissions are excluded above so the 3 seeded system roles
  // (isSystem: true) survive as long-lived reference data — but a test that
  // creates its own custom role (isSystem: false, e.g. access.test.ts's
  // "Custom Reviewer") must not have that row survive into the next test,
  // or it collides on the unique `name` constraint next time that test
  // runs. role_permissions rows cascade with the role.
  await prisma.role.deleteMany({ where: { isSystem: false } });
}
