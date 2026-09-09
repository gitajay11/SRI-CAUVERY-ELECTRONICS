import 'server-only';
import { db } from '@tamizh/db';
import type { StockReason } from '@tamizh/db/enums';
import { AppError, notFound } from '@tamizh/core/api';
import { recordAudit } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';
import { maybeNotifyLowStock } from './notifications';

/**
 * Stock.
 *
 * The one rule this module exists to enforce: **stock never changes without a
 * matching InventoryTransaction row, written in the same transaction.** Not
 * from the admin UI, not from an order, not from a cancellation. That is what
 * makes the ledger reconcilable — the sum of every movement for a product must
 * equal its current count, and if it does not, something wrote around this
 * module and that is a bug.
 *
 * Available stock is `stock - reservedStock`: units on the shelf minus units
 * already promised to unfulfilled orders.
 */

export interface StockFilters {
  q?: string;
  categoryId?: string;
  /** `low` is at-or-below threshold; `out` is nothing left. */
  filter?: 'all' | 'low' | 'out';
  page: number;
  pageSize: number;
}

export interface StockRow {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  stock: number;
  reserved: number;
  available: number;
  incoming: number;
  threshold: number;
  imageUrl: string | null;
}

export async function listStock(filters: StockFilters): Promise<{
  rows: StockRow[];
  total: number;
}> {
  const and: Record<string, unknown>[] = [{ deletedAt: null }];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { nameTa: { contains: filters.q, mode: 'insensitive' } },
        { sku: { contains: filters.q, mode: 'insensitive' } },
      ],
    });
  }
  if (filters.categoryId) and.push({ categoryId: filters.categoryId });
  if (filters.filter === 'out') and.push({ stock: { lte: 0 } });

  const where = { AND: and } as never;

  // "Low" compares two columns, which Prisma's filter language cannot express,
  // so that case is answered with raw SQL against the partial index.
  if (filters.filter === 'low') {
    const offset = (filters.page - 1) * filters.pageSize;
    const search = filters.q ? `%${filters.q}%` : null;

    const [rows, countRows] = await Promise.all([
      db.$queryRaw<
        (StockRow & { categoryName: string | null; imageUrl: string | null })[]
      >`
        SELECT p."id", p."name", p."sku", p."stock", p."reservedStock" AS reserved,
               (p."stock" - p."reservedStock") AS available,
               p."incomingStock" AS incoming, p."lowStockThreshold" AS threshold,
               c."name" AS "categoryName",
               (SELECT i."url" FROM "ProductImage" i
                 WHERE i."productId" = p."id"
                 ORDER BY i."sortOrder" ASC LIMIT 1) AS "imageUrl"
        FROM "Product" p
        JOIN "Category" c ON c."id" = p."categoryId"
        WHERE p."deletedAt" IS NULL
          AND p."stock" <= p."lowStockThreshold"
          AND (${search}::text IS NULL
               OR p."name" ILIKE ${search} OR p."sku" ILIKE ${search})
        ORDER BY p."stock" ASC
        LIMIT ${filters.pageSize} OFFSET ${offset}`,
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM "Product" p
        WHERE p."deletedAt" IS NULL
          AND p."stock" <= p."lowStockThreshold"
          AND (${search}::text IS NULL
               OR p."name" ILIKE ${search} OR p."sku" ILIKE ${search})`,
    ]);

    return {
      total: Number(countRows[0]?.count ?? 0),
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        categoryName: row.categoryName ?? '—',
        stock: Number(row.stock),
        reserved: Number(row.reserved),
        available: Number(row.available),
        incoming: Number(row.incoming),
        threshold: Number(row.threshold),
        imageUrl: row.imageUrl,
      })),
    };
  }

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { stock: 'asc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        reservedStock: true,
        incomingStock: true,
        lowStockThreshold: true,
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      categoryName: row.category.name,
      stock: row.stock,
      reserved: row.reservedStock,
      available: row.stock - row.reservedStock,
      incoming: row.incomingStock,
      threshold: row.lowStockThreshold,
      imageUrl: row.images[0]?.url ?? null,
    })),
  };
}

export interface AdjustInput {
  productId: string;
  variantId?: string | null;
  /** `delta` adds or removes; `set` corrects to an exact count after a count. */
  mode: 'delta' | 'set';
  value: number;
  reason: StockReason;
  note?: string;
}

/**
 * The single entry point for a manual stock change.
 *
 * Refuses to take stock below zero rather than silently clamping: a negative
 * count means the person adjusting has the wrong figure, and quietly writing 0
 * would hide that.
 */
export async function adjustStock(actor: AdminIdentity, input: AdjustInput) {
  const result = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, sku: true, stock: true, deletedAt: true },
    });
    if (!product || product.deletedAt) throw notFound('Product not found.');

    const before = product.stock;
    const after = input.mode === 'set' ? input.value : before + input.value;

    if (after < 0) {
      throw new AppError(
        `That would take ${product.name} to ${after}. Stock cannot go below zero.`,
        422,
        'negative_stock',
        { value: 'Not enough stock for that adjustment.' },
      );
    }
    if (after === before) {
      throw new AppError('That would not change anything.', 422, 'no_change', {
        value: 'Enter a different quantity.',
      });
    }

    await tx.product.update({
      where: { id: product.id },
      data: { stock: after },
    });

    await tx.inventoryTransaction.create({
      data: {
        productId: product.id,
        variantId: input.variantId ?? null,
        change: after - before,
        quantityBefore: before,
        quantityAfter: after,
        reason: input.reason,
        note: input.note?.trim() || null,
        actorId: actor.id,
      },
    });

    await recordAudit(
      actor,
      {
        action: 'inventory.adjusted',
        entityType: 'Product',
        entityId: product.id,
        summary: `${product.name} (${product.sku}): ${before} → ${after}`,
        changes: { stock: { from: before, to: after } },
      },
      tx,
    );

    return { before, after, product };
  });

  // Outside the transaction: a notification failure must not roll back a
  // stock change that is otherwise correct.
  await maybeNotifyLowStock(input.productId, result.before, result.after);

  return result;
}

export async function listStockHistory(productId: string, limit = 50) {
  const rows = await db.inventoryTransaction.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    change: row.change,
    quantityBefore: row.quantityBefore,
    quantityAfter: row.quantityAfter,
    reason: row.reason,
    note: row.note,
    actor: row.actor?.name ?? null,
    orderNumber: row.order?.orderNumber ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Reconciliation check.
 *
 * Sums the ledger for a product and compares it with the stored count. Used by
 * the inventory screen to surface a discrepancy rather than let it sit — if
 * these ever disagree, something bypassed `adjustStock`.
 */
export async function reconcile(productId: string): Promise<{
  ledger: number;
  actual: number;
  balanced: boolean;
}> {
  const [aggregate, product] = await Promise.all([
    db.inventoryTransaction.aggregate({
      where: { productId },
      _sum: { change: true },
    }),
    db.product.findUnique({ where: { id: productId }, select: { stock: true } }),
  ]);

  const ledger = aggregate._sum.change ?? 0;
  const actual = product?.stock ?? 0;
  return { ledger, actual, balanced: ledger === actual };
}
