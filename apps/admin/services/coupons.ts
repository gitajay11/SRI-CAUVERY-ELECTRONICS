import 'server-only';
import { db } from '@tamizh/db';
import { AppError, notFound } from '@tamizh/core/api';
import { recordAudit, diff } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Coupons.
 *
 * Percentage coupons are stored in basis points and flat ones in paise, so
 * "10%" and "₹100" are both exact integers — the same convention the pricing
 * engine reads when it applies them at checkout. Nothing here duplicates that
 * logic; this module only decides what a coupon *is*.
 *
 * A coupon that has been used is never hard-deleted: past orders reference it,
 * and a redemption history that can vanish is not a history. It is switched
 * off instead.
 */

export interface CouponFilters {
  q?: string;
  state?: 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';
  page: number;
  pageSize: number;
}

export interface CouponRow {
  id: string;
  code: string;
  description: string;
  type: 'PERCENT' | 'FLAT' | 'FREE_SHIPPING';
  /** Basis points for PERCENT, paise for FLAT. */
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  isActive: boolean;
  scopeCount: number;
  /** Money actually given away through this coupon. */
  discountGiven: number;
  /** Derived here rather than in the page, which must stay pure. */
  state: 'active' | 'scheduled' | 'expired' | 'inactive';
}

export async function listCoupons(filters: CouponFilters): Promise<{
  rows: CouponRow[];
  total: number;
}> {
  const now = new Date();
  const and: Record<string, unknown>[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { code: { contains: filters.q.toUpperCase() } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ],
    });
  }

  switch (filters.state) {
    case 'active':
      and.push({
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      });
      break;
    case 'scheduled':
      and.push({ isActive: true, startsAt: { gt: now } });
      break;
    case 'expired':
      and.push({ endsAt: { lt: now } });
      break;
    case 'inactive':
      and.push({ isActive: false });
      break;
    default:
      break;
  }

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows] = await Promise.all([
    db.coupon.count({ where }),
    db.coupon.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        value: true,
        minOrder: true,
        maxDiscount: true,
        startsAt: true,
        endsAt: true,
        usageLimit: true,
        perUserLimit: true,
        usedCount: true,
        isActive: true,
        _count: { select: { categories: true, products: true } },
        orders: { select: { discountTotal: true } },
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      type: row.type,
      value: row.value,
      minOrder: row.minOrder,
      maxDiscount: row.maxDiscount,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      usageLimit: row.usageLimit,
      perUserLimit: row.perUserLimit,
      usedCount: row.usedCount,
      isActive: row.isActive,
      scopeCount: row._count.categories + row._count.products,
      discountGiven: row.orders.reduce((sum, order) => sum + order.discountTotal, 0),
      state: !row.isActive
        ? 'inactive'
        : row.endsAt !== null && row.endsAt < now
          ? 'expired'
          : row.startsAt > now
            ? 'scheduled'
            : 'active',
    })),
  };
}

export async function getCoupon(id: string) {
  const coupon = await db.coupon.findUnique({
    where: { id },
    include: {
      categories: { select: { categoryId: true } },
      products: { select: { productId: true } },
      redemptions: {
        orderBy: { usedAt: 'desc' },
        take: 20,
        select: { id: true, amount: true, usedAt: true, orderId: true, userId: true },
      },
    },
  });
  if (!coupon) return null;

  const totals = await db.order.aggregate({
    where: { couponId: coupon.id, status: { not: 'CANCELLED' } },
    _sum: { discountTotal: true, total: true },
    _count: { _all: true },
  });

  return {
    ...coupon,
    stats: {
      orders: totals._count._all,
      revenue: totals._sum.total ?? 0,
      discountGiven: totals._sum.discountTotal ?? 0,
    },
  };
}

export interface CouponInput {
  code: string;
  description: string;
  type: 'PERCENT' | 'FLAT' | 'FREE_SHIPPING';
  /** Already converted: basis points for PERCENT, paise for FLAT. */
  value: number;
  minOrder: number;
  maxDiscount?: number | null;
  startsAt?: string;
  endsAt?: string | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  isActive: boolean;
  categoryIds: string[];
  productIds: string[];
}

function validate(input: CouponInput) {
  if (input.value <= 0) {
    throw new AppError('Enter a discount above zero.', 422, 'invalid_value', {
      value: 'Enter a value above zero.',
    });
  }
  if (input.type === 'PERCENT' && input.value > 10_000) {
    throw new AppError('A percentage discount cannot exceed 100%.', 422, 'invalid_value', {
      value: 'At most 100%.',
    });
  }
  if (input.endsAt && input.startsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    throw new AppError('The end date must be after the start date.', 422, 'invalid_dates', {
      endsAt: 'Must be after the start date.',
    });
  }
}

async function assertCodeFree(code: string, excludeId?: string) {
  const clash = await db.coupon.findFirst({
    where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new AppError('A coupon with this code already exists.', 409, 'duplicate_code', {
      code: 'This code is already in use.',
    });
  }
}

export async function createCoupon(actor: AdminIdentity, input: CouponInput) {
  await assertCodeFree(input.code);
  validate(input);

  return db.$transaction(async (tx) => {
    const coupon = await tx.coupon.create({
      data: {
        code: input.code,
        description: input.description,
        type: input.type,
        value: input.value,
        minOrder: input.minOrder,
        maxDiscount: input.maxDiscount ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        isActive: input.isActive,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
        products: { create: input.productIds.map((productId) => ({ productId })) },
      },
      select: { id: true, code: true },
    });

    await recordAudit(
      actor,
      {
        action: 'coupon.created',
        entityType: 'Coupon',
        entityId: coupon.id,
        summary: `Created coupon ${coupon.code}`,
      },
      tx,
    );

    return coupon;
  });
}

export async function updateCoupon(actor: AdminIdentity, id: string, input: CouponInput) {
  const existing = await db.coupon.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      description: true,
      type: true,
      value: true,
      minOrder: true,
      maxDiscount: true,
      usageLimit: true,
      perUserLimit: true,
      isActive: true,
      usedCount: true,
    },
  });
  if (!existing) throw notFound('Coupon not found.');

  await assertCodeFree(input.code, id);
  validate(input);

  // Changing what a used coupon means would rewrite history for the orders
  // that already claimed it, so the discount itself is frozen once redeemed.
  if (
    existing.usedCount > 0 &&
    (existing.type !== input.type || existing.value !== input.value)
  ) {
    throw new AppError(
      `${existing.code} has already been used ${existing.usedCount} time(s). Switch it off and create a new coupon instead of changing the discount.`,
      409,
      'coupon_in_use',
      { value: 'Cannot change the discount on a used coupon.' },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.coupon.update({
      where: { id },
      data: {
        code: input.code,
        description: input.description,
        type: input.type,
        value: input.value,
        minOrder: input.minOrder,
        maxDiscount: input.maxDiscount ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        isActive: input.isActive,
      },
    });

    await tx.couponCategory.deleteMany({ where: { couponId: id } });
    await tx.couponProduct.deleteMany({ where: { couponId: id } });
    if (input.categoryIds.length > 0) {
      await tx.couponCategory.createMany({
        data: input.categoryIds.map((categoryId) => ({ couponId: id, categoryId })),
      });
    }
    if (input.productIds.length > 0) {
      await tx.couponProduct.createMany({
        data: input.productIds.map((productId) => ({ couponId: id, productId })),
      });
    }

    await recordAudit(
      actor,
      {
        action: 'coupon.updated',
        entityType: 'Coupon',
        entityId: id,
        summary: `Updated coupon ${input.code}`,
        changes: diff(
          existing as unknown as Record<string, unknown>,
          input as unknown as Record<string, unknown>,
          [
            'code',
            'description',
            'type',
            'value',
            'minOrder',
            'maxDiscount',
            'usageLimit',
            'perUserLimit',
            'isActive',
          ],
        ),
      },
      tx,
    );
  });

  return { id };
}

/** Deletes an unused coupon; switches off one that has been redeemed. */
export async function removeCoupon(actor: AdminIdentity, id: string) {
  const coupon = await db.coupon.findUnique({
    where: { id },
    select: { id: true, code: true, usedCount: true, _count: { select: { orders: true } } },
  });
  if (!coupon) throw notFound('Coupon not found.');

  const used = coupon.usedCount > 0 || coupon._count.orders > 0;

  await db.$transaction(async (tx) => {
    if (used) {
      await tx.coupon.update({ where: { id }, data: { isActive: false } });
    } else {
      await tx.couponCategory.deleteMany({ where: { couponId: id } });
      await tx.couponProduct.deleteMany({ where: { couponId: id } });
      await tx.coupon.delete({ where: { id } });
    }

    await recordAudit(
      actor,
      {
        action: 'coupon.deleted',
        entityType: 'Coupon',
        entityId: id,
        summary: used
          ? `Switched off coupon ${coupon.code} — it has been redeemed`
          : `Deleted coupon ${coupon.code}`,
      },
      tx,
    );
  });

  return { deactivated: used };
}
