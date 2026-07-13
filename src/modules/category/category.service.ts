import { Prisma } from "@prisma/client";
import { ErrorMessages, HttpStatus } from "../../constants/index.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.validation.js";

// Prisma 7's driver-adapter engine (`@prisma/adapter-pg`) surfaces Postgres
// constraint violations as a `DriverAdapterError` with a `.cause`, not the
// classic `PrismaClientKnownRequestError` with a P-code — checked first as
// defense in depth in case a non-adapter Prisma path ever fires instead.
// Postgres itself uses two distinct SQLSTATE codes here: `23503` is a
// general foreign-key violation (which adapter-pg maps to a friendly
// "ForeignKeyConstraintViolation" kind), but our `onDelete: Restrict` clause
// specifically triggers `23001` ("restrict_violation"), which adapter-pg's
// mapper doesn't special-case — it falls through to a generic `"postgres"`
// kind carrying the raw code. Both are checked since which one fires is a
// property of the constraint action, not something to assume.
function isForeignKeyRestrictError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
    return true;
  }
  if (!(err instanceof Error) || err.name !== "DriverAdapterError") {
    return false;
  }
  const cause = (err as unknown as { cause?: { kind?: string; code?: string } }).cause;
  return cause?.kind === "ForeignKeyConstraintViolation" || cause?.code === "23001";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// The DB unique index on (parentId, name) only catches collisions where
// parentId is non-null — SQL treats every NULL as distinct from every other
// NULL, so two top-level categories sharing a name would NOT violate it.
// This check is the primary correctness mechanism for both cases; the DB
// index remains as a race-condition safety net for the non-null case.
async function assertNameAvailable(parentId: string | null, name: string, excludeId?: string) {
  const existing = await prisma.category.findFirst({
    where: { parentId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (existing) {
    throw new ApiError(HttpStatus.CONFLICT, ErrorMessages.CATEGORY_NAME_TAKEN);
  }
}

async function assertParentExists(parentId: string) {
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) {
    throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.CATEGORY_PARENT_NOT_FOUND);
  }
}

async function assertNoCycle(categoryId: string, newParentId: string) {
  let current: string | null = newParentId;
  while (current) {
    if (current === categoryId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, ErrorMessages.CATEGORY_CYCLE);
    }
    const parent: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = parent?.parentId ?? null;
  }
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(input: CreateCategoryInput) {
  const parentId = input.parentId ?? null;

  if (parentId) {
    await assertParentExists(parentId);
  }
  await assertNameAvailable(parentId, input.name);

  return prisma.category.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      parentId,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertParentExists(input.parentId);
    await assertNoCycle(id, input.parentId);
  }

  if (input.name !== undefined || input.parentId !== undefined) {
    const nextParentId = input.parentId !== undefined ? input.parentId : category.parentId;
    const nextName = input.name ?? category.name;
    await assertNameAvailable(nextParentId, nextName, id);
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.name ? slugify(input.name) : undefined,
      description: input.description,
      parentId: input.parentId !== undefined ? input.parentId : undefined,
      isActive: input.isActive,
    },
  });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(HttpStatus.NOT_FOUND, ErrorMessages.NOT_FOUND);
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch (err) {
    if (isForeignKeyRestrictError(err)) {
      throw new ApiError(HttpStatus.CONFLICT, ErrorMessages.CATEGORY_HAS_CHILDREN);
    }
    throw err;
  }
}
