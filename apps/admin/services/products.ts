import 'server-only';
import { db } from '@tamizh/db';
import type { ProductStatus } from '@tamizh/db/enums';
import { AppError, notFound } from '@tamizh/core/api';
import { recordAudit, diff } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Product catalogue management.
 *
 * Two things worth knowing about how this treats deletion and price:
 *
 *  - A product that appears on any past order is never hard-deleted. It is
 *    soft-deleted, so historical orders keep resolving to a real row rather
 *    than a dangling id. Only a product nobody has ever bought can truly go.
 *
 *  - A price change is audited as its own action, separately from other edits,
 *    because "who changed the price of this and when" is the question a shop
 *    owner actually asks.
 */

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  status?: ProductStatus | 'ALL';
  page: number;
  pageSize: number;
}

export interface ProductRow {
  id: string;
  sku: string;
  slug: string;
  name: string;
  nameTa: string | null;
  brand: string;
  categoryName: string;
  price: number;
  mrp: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  isFeatured: boolean;
  imageUrl: string | null;
  soldCount: number;
  updatedAt: string;
}

export async function listProducts(filters: ProductFilters): Promise<{
  rows: ProductRow[];
  total: number;
}> {
  const and: Record<string, unknown>[] = [{ deletedAt: null }];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { nameTa: { contains: filters.q, mode: 'insensitive' } },
        { sku: { contains: filters.q, mode: 'insensitive' } },
        { brand: { contains: filters.q, mode: 'insensitive' } },
      ],
    });
  }
  if (filters.categoryId) and.push({ categoryId: filters.categoryId });
  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });

  const where = { AND: and } as never;

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        sku: true,
        slug: true,
        name: true,
        nameTa: true,
        brand: true,
        price: true,
        mrp: true,
        costPrice: true,
        stock: true,
        lowStockThreshold: true,
        status: true,
        isFeatured: true,
        soldCount: true,
        updatedAt: true,
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      slug: row.slug,
      name: row.name,
      nameTa: row.nameTa,
      brand: row.brand,
      categoryName: row.category.name,
      price: row.price,
      mrp: row.mrp,
      costPrice: row.costPrice,
      stock: row.stock,
      lowStockThreshold: row.lowStockThreshold,
      status: row.status,
      isFeatured: row.isFeatured,
      imageUrl: row.images[0]?.url ?? null,
      soldCount: row.soldCount,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function getProduct(id: string) {
  return db.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { sortOrder: 'asc' } },
      category: { select: { id: true, name: true } },
    },
  });
}

export interface ProductInput {
  sku: string;
  slug: string;
  name: string;
  nameTa?: string;
  description: string;
  descriptionTa?: string;
  brand: string;
  categoryId: string;
  /** Paise. */
  mrp: number;
  price: number;
  costPrice: number;
  /** Basis points. */
  taxBps: number;
  stock: number;
  lowStockThreshold: number;
  weightGrams?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  tags: string[];
  specs: Record<string, string>;
  images: { url: string; alt: string }[];
}

async function assertUnique(sku: string, slug: string, excludeId?: string) {
  const clash = await db.product.findFirst({
    where: {
      OR: [{ sku }, { slug }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { sku: true, slug: true },
  });
  if (!clash) return;
  if (clash.sku === sku) {
    throw new AppError('A product with this SKU already exists.', 409, 'duplicate_sku', {
      sku: 'This SKU is already in use.',
    });
  }
  throw new AppError(
    'A product with this URL slug already exists.',
    409,
    'duplicate_slug',
    { slug: 'This slug is already in use.' },
  );
}

function validatePricing(input: Pick<ProductInput, 'price' | 'mrp'>) {
  if (input.price > input.mrp) {
    throw new AppError(
      'The selling price cannot be above the M.R.P.',
      422,
      'price_above_mrp',
      { price: 'Must be at or below the M.R.P.' },
    );
  }
}

export async function createProduct(actor: AdminIdentity, input: ProductInput) {
  await assertUnique(input.sku, input.slug);
  validatePricing(input);

  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku: input.sku,
        slug: input.slug,
        name: input.name,
        nameTa: input.nameTa || null,
        description: input.description,
        descriptionTa: input.descriptionTa || null,
        brand: input.brand,
        categoryId: input.categoryId,
        mrp: input.mrp,
        price: input.price,
        costPrice: input.costPrice,
        taxBps: input.taxBps,
        stock: input.stock,
        lowStockThreshold: input.lowStockThreshold,
        weightGrams: input.weightGrams ?? null,
        lengthMm: input.lengthMm ?? null,
        widthMm: input.widthMm ?? null,
        heightMm: input.heightMm ?? null,
        status: input.status,
        isFeatured: input.isFeatured,
        isBestSeller: input.isBestSeller,
        isNewArrival: input.isNewArrival,
        tags: input.tags,
        specs: input.specs as never,
        publishedAt: input.status === 'ACTIVE' ? new Date() : null,
        images: {
          create: input.images.map((image, index) => ({
            url: image.url,
            alt: image.alt || input.name,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
      select: { id: true, name: true, sku: true },
    });

    // Opening stock is a real movement, so the ledger reconciles from unit one.
    if (input.stock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          productId: product.id,
          change: input.stock,
          quantityBefore: 0,
          quantityAfter: input.stock,
          reason: 'PURCHASE',
          note: 'Opening stock',
          actorId: actor.id,
        },
      });
    }

    await recordAudit(
      actor,
      {
        action: 'product.created',
        entityType: 'Product',
        entityId: product.id,
        summary: `Created ${product.name} (${product.sku})`,
      },
      tx,
    );

    return product;
  });
}

export async function updateProduct(
  actor: AdminIdentity,
  id: string,
  input: ProductInput,
) {
  const existing = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      sku: true,
      slug: true,
      name: true,
      nameTa: true,
      brand: true,
      categoryId: true,
      price: true,
      mrp: true,
      costPrice: true,
      taxBps: true,
      lowStockThreshold: true,
      status: true,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      stock: true,
    },
  });
  if (!existing) throw notFound('Product not found.');

  await assertUnique(input.sku, input.slug, id);
  validatePricing(input);

  // Stock is not editable here — it moves only through the inventory module,
  // so that every change carries a reason and lands in the ledger.
  const { stock: _ignoredStock, ...editable } = input;
  void _ignoredStock;

  return db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        sku: editable.sku,
        slug: editable.slug,
        name: editable.name,
        nameTa: editable.nameTa || null,
        description: editable.description,
        descriptionTa: editable.descriptionTa || null,
        brand: editable.brand,
        categoryId: editable.categoryId,
        mrp: editable.mrp,
        price: editable.price,
        costPrice: editable.costPrice,
        taxBps: editable.taxBps,
        lowStockThreshold: editable.lowStockThreshold,
        weightGrams: editable.weightGrams ?? null,
        lengthMm: editable.lengthMm ?? null,
        widthMm: editable.widthMm ?? null,
        heightMm: editable.heightMm ?? null,
        status: editable.status,
        isFeatured: editable.isFeatured,
        isBestSeller: editable.isBestSeller,
        isNewArrival: editable.isNewArrival,
        tags: editable.tags,
        specs: editable.specs as never,
        publishedAt:
          editable.status === 'ACTIVE' && existing.status !== 'ACTIVE'
            ? new Date()
            : undefined,
      },
    });

    await tx.productImage.deleteMany({ where: { productId: id } });
    if (editable.images.length > 0) {
      await tx.productImage.createMany({
        data: editable.images.map((image, index) => ({
          productId: id,
          url: image.url,
          alt: image.alt || editable.name,
          sortOrder: index,
          isPrimary: index === 0,
        })),
      });
    }

    const changes = diff(
      existing as unknown as Record<string, unknown>,
      editable as unknown as Record<string, unknown>,
      [
        'sku',
        'slug',
        'name',
        'nameTa',
        'brand',
        'categoryId',
        'price',
        'mrp',
        'costPrice',
        'taxBps',
        'lowStockThreshold',
        'status',
        'isFeatured',
        'isBestSeller',
        'isNewArrival',
      ],
    );

    // A price change gets its own audit action — it is the one edit a shop
    // owner goes looking for.
    const priceChanged = 'price' in changes || 'mrp' in changes;
    if (priceChanged) {
      await recordAudit(
        actor,
        {
          action: 'product.price_changed',
          entityType: 'Product',
          entityId: id,
          summary: `Price of ${editable.name} changed`,
          changes: Object.fromEntries(
            Object.entries(changes).filter(([key]) => key === 'price' || key === 'mrp'),
          ),
        },
        tx,
      );
    }

    const otherChanges = Object.fromEntries(
      Object.entries(changes).filter(([key]) => key !== 'price' && key !== 'mrp'),
    );
    if (Object.keys(otherChanges).length > 0 || !priceChanged) {
      await recordAudit(
        actor,
        {
          action: 'product.updated',
          entityType: 'Product',
          entityId: id,
          summary: `Updated ${editable.name} (${editable.sku})`,
          changes: otherChanges,
        },
        tx,
      );
    }

    return { id };
  });
}

/**
 * Archives or deletes.
 *
 * A product with order history is archived — deleting it would leave past
 * orders pointing at nothing. Only an untouched product is actually removed.
 */
export async function removeProduct(actor: AdminIdentity, id: string) {
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, sku: true, _count: { select: { orderItems: true } } },
  });
  if (!product) throw notFound('Product not found.');

  const hasHistory = product._count.orderItems > 0;

  await db.$transaction(async (tx) => {
    if (hasHistory) {
      await tx.product.update({
        where: { id },
        data: { status: 'ARCHIVED', isFeatured: false, deletedAt: new Date() },
      });
    } else {
      await tx.product.delete({ where: { id } });
    }

    await recordAudit(
      actor,
      {
        action: hasHistory ? 'product.archived' : 'product.deleted',
        entityType: 'Product',
        entityId: id,
        summary: hasHistory
          ? `Archived ${product.name} (${product.sku}) — it appears on past orders`
          : `Deleted ${product.name} (${product.sku})`,
      },
      tx,
    );
  });

  return { archived: hasHistory };
}

export async function setProductStatus(
  actor: AdminIdentity,
  id: string,
  status: ProductStatus,
) {
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, status: true },
  });
  if (!product) throw notFound('Product not found.');

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        status,
        publishedAt: status === 'ACTIVE' && product.status !== 'ACTIVE' ? new Date() : undefined,
      },
    });
    await recordAudit(
      actor,
      {
        action: status === 'ACTIVE' ? 'product.published' : 'product.unpublished',
        entityType: 'Product',
        entityId: id,
        summary: `${product.name}: ${product.status} → ${status}`,
        changes: { status: { from: product.status, to: status } },
      },
      tx,
    );
  });
}

/** Copies a product as a draft, so a similar item is a minute's work. */
export async function duplicateProduct(actor: AdminIdentity, id: string) {
  const source = await db.product.findFirst({
    where: { id, deletedAt: null },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!source) throw notFound('Product not found.');

  const suffix = Date.now().toString(36).slice(-4).toUpperCase();

  const copy = await db.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        sku: `${source.sku}-COPY-${suffix}`,
        slug: `${source.slug}-copy-${suffix.toLowerCase()}`,
        name: `${source.name} (copy)`,
        nameTa: source.nameTa,
        description: source.description,
        descriptionTa: source.descriptionTa,
        brand: source.brand,
        categoryId: source.categoryId,
        mrp: source.mrp,
        price: source.price,
        costPrice: source.costPrice,
        taxBps: source.taxBps,
        // A copy starts empty: stock belongs to the original.
        stock: 0,
        lowStockThreshold: source.lowStockThreshold,
        weightGrams: source.weightGrams,
        lengthMm: source.lengthMm,
        widthMm: source.widthMm,
        heightMm: source.heightMm,
        // Always a draft, so a half-edited copy never reaches the shop.
        status: 'DRAFT',
        tags: source.tags,
        specs: source.specs as never,
        images: {
          create: source.images.map((image, index) => ({
            url: image.url,
            alt: image.alt,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
      select: { id: true, name: true },
    });

    await recordAudit(
      actor,
      {
        action: 'product.duplicated',
        entityType: 'Product',
        entityId: created.id,
        summary: `Duplicated ${source.name}`,
      },
      tx,
    );

    return created;
  });

  return copy;
}
