import 'server-only';
import { db } from '@tamizh/db';
import { AppError, notFound } from '@tamizh/core/api';
import { recordAudit, diff } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Categories.
 *
 * The tree is deliberately two levels deep: a parent is a browsing bucket on
 * the shop's menu, and products hang off its children. That is enforced here
 * rather than left to discipline — a category whose parent already has a
 * parent would render as a menu nobody can navigate.
 *
 * Deletion is refused while anything still depends on the row. A category with
 * products or children is disabled instead, which takes it off the shop
 * without orphaning what points at it.
 */

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  nameTa: string;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
}

export async function listCategoryTree(): Promise<CategoryNode[]> {
  const rows = await db.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameTa: true,
      icon: true,
      imageUrl: true,
      sortOrder: true,
      isActive: true,
      parentId: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });

  const nodes = new Map<string, CategoryNode>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        nameTa: row.nameTa,
        icon: row.icon,
        imageUrl: row.imageUrl,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        parentId: row.parentId,
        productCount: row._count.products,
        children: [],
      },
    ]),
  );

  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getCategory(id: string) {
  return db.category.findFirst({ where: { id, deletedAt: null } });
}

export interface CategoryInput {
  slug: string;
  name: string;
  nameTa: string;
  description?: string;
  descriptionTa?: string;
  icon?: string;
  imageUrl?: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Keeps the tree two levels deep and stops a category parenting itself. */
async function validateParent(parentId: string | null | undefined, selfId?: string) {
  if (!parentId) return null;
  if (selfId && parentId === selfId) {
    throw new AppError('A category cannot be inside itself.', 422, 'self_parent', {
      parentId: 'Choose a different parent.',
    });
  }

  const parent = await db.category.findFirst({
    where: { id: parentId, deletedAt: null },
    select: { id: true, parentId: true, name: true },
  });
  if (!parent) {
    throw new AppError('That parent category no longer exists.', 422, 'parent_missing', {
      parentId: 'Choose a category that still exists.',
    });
  }
  if (parent.parentId) {
    throw new AppError(
      `“${parent.name}” is already a sub-category. Categories go two levels deep.`,
      422,
      'too_deep',
      { parentId: 'Choose a top-level category.' },
    );
  }
  if (selfId) {
    const childCount = await db.category.count({
      where: { parentId: selfId, deletedAt: null },
    });
    if (childCount > 0) {
      throw new AppError(
        'This category has sub-categories, so it has to stay at the top level.',
        422,
        'has_children',
        { parentId: 'Move its sub-categories first.' },
      );
    }
  }
  return parent.id;
}

async function assertSlugFree(slug: string, excludeId?: string) {
  const clash = await db.category.findFirst({
    where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new AppError('A category with this URL slug already exists.', 409, 'duplicate_slug', {
      slug: 'This slug is already in use.',
    });
  }
}

export async function createCategory(actor: AdminIdentity, input: CategoryInput) {
  await assertSlugFree(input.slug);
  const parentId = await validateParent(input.parentId);

  const category = await db.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: {
        slug: input.slug,
        name: input.name,
        nameTa: input.nameTa,
        description: input.description || null,
        descriptionTa: input.descriptionTa || null,
        icon: input.icon || null,
        imageUrl: input.imageUrl || null,
        parentId,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: { id: true, name: true },
    });

    await recordAudit(
      actor,
      {
        action: 'category.created',
        entityType: 'Category',
        entityId: created.id,
        summary: `Created category ${created.name}`,
      },
      tx,
    );

    return created;
  });

  return category;
}

export async function updateCategory(
  actor: AdminIdentity,
  id: string,
  input: CategoryInput,
) {
  const existing = await db.category.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      nameTa: true,
      icon: true,
      imageUrl: true,
      parentId: true,
      sortOrder: true,
      isActive: true,
    },
  });
  if (!existing) throw notFound('Category not found.');

  await assertSlugFree(input.slug, id);
  const parentId = await validateParent(input.parentId, id);

  await db.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        nameTa: input.nameTa,
        description: input.description || null,
        descriptionTa: input.descriptionTa || null,
        icon: input.icon || null,
        imageUrl: input.imageUrl || null,
        parentId,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });

    await recordAudit(
      actor,
      {
        action: 'category.updated',
        entityType: 'Category',
        entityId: id,
        summary: `Updated category ${input.name}`,
        changes: diff(
          existing as unknown as Record<string, unknown>,
          { ...input, parentId } as unknown as Record<string, unknown>,
          ['slug', 'name', 'nameTa', 'icon', 'imageUrl', 'parentId', 'sortOrder', 'isActive'],
        ),
      },
      tx,
    );
  });

  return { id };
}

/**
 * Removes a category, or explains why it cannot go.
 *
 * Refusing is the right answer here rather than cascading: deleting a category
 * with products would either orphan them or silently delete a chunk of the
 * catalogue, and neither is something a person clicking "delete" is asking for.
 */
export async function removeCategory(actor: AdminIdentity, id: string) {
  const category = await db.category.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          products: { where: { deletedAt: null } },
          children: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!category) throw notFound('Category not found.');

  if (category._count.products > 0) {
    throw new AppError(
      `“${category.name}” still holds ${category._count.products} product(s). Move them first, or switch the category off instead.`,
      409,
      'category_in_use',
    );
  }
  if (category._count.children > 0) {
    throw new AppError(
      `“${category.name}” still has sub-categories. Remove or move them first.`,
      409,
      'category_has_children',
    );
  }

  await db.$transaction(async (tx) => {
    // Soft delete: coupon scopes and past products may still reference it.
    await tx.category.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await recordAudit(
      actor,
      {
        action: 'category.deleted',
        entityType: 'Category',
        entityId: id,
        summary: `Deleted category ${category.name}`,
      },
      tx,
    );
  });

  return { deleted: true };
}

export async function setCategoryActive(
  actor: AdminIdentity,
  id: string,
  isActive: boolean,
) {
  const category = await db.category.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, isActive: true },
  });
  if (!category) throw notFound('Category not found.');

  await db.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { isActive } });
    // Switching a parent off takes its children with it, otherwise the shop
    // shows a sub-category with no way to reach it.
    await tx.category.updateMany({ where: { parentId: id }, data: { isActive } });

    await recordAudit(
      actor,
      {
        action: 'category.updated',
        entityType: 'Category',
        entityId: id,
        summary: `${category.name} ${isActive ? 'shown on' : 'hidden from'} the shop`,
        changes: { isActive: { from: category.isActive, to: isActive } },
      },
      tx,
    );
  });

  return { isActive };
}

/**
 * Applies a new display order.
 *
 * The whole list is written in one transaction: a half-applied reorder would
 * leave the shop's menu in an order nobody chose.
 */
export async function reorderCategories(
  actor: AdminIdentity,
  order: { id: string; sortOrder: number }[],
) {
  if (order.length === 0) return { updated: 0 };
  if (order.length > 200) {
    throw new AppError('Too many categories in one reorder.', 422, 'too_many');
  }

  const ids = order.map((entry) => entry.id);
  const known = await db.category.count({ where: { id: { in: ids }, deletedAt: null } });
  if (known !== ids.length) {
    throw new AppError(
      'The list changed while you were reordering it. Reload and try again.',
      409,
      'stale_order',
    );
  }

  await db.$transaction(async (tx) => {
    for (const entry of order) {
      await tx.category.update({
        where: { id: entry.id },
        data: { sortOrder: entry.sortOrder },
      });
    }
    await recordAudit(
      actor,
      {
        action: 'category.reordered',
        entityType: 'Category',
        summary: `Reordered ${order.length} categories`,
      },
      tx,
    );
  });

  return { updated: order.length };
}
