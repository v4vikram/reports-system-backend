import { HttpStatus } from "../../constants/httpStatus.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.types.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slugs are unique; append -2, -3, ... until we find a free one.
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "category";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === excludeId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

async function assertParentExists(parentId: string | null | undefined) {
  if (!parentId) return;
  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) throw new ApiError(HttpStatus.BAD_REQUEST, "parentId does not reference a valid category");
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(input: CreateCategoryInput) {
  await assertParentExists(input.parentId);
  return prisma.category.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
      slug: await uniqueSlug(slugify(input.name)),
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, "Category not found");

  if (input.parentId) {
    if (input.parentId === id) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "A category cannot be its own parent");
    }
    await assertParentExists(input.parentId);
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.name !== undefined && { slug: await uniqueSlug(slugify(input.name), id) }),
    },
  });
}

export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, "Category not found");
  // Children are detached (parentId set null) via the schema relation.
  await prisma.category.delete({ where: { id } });
}
