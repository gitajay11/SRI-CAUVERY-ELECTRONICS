import 'server-only';
import { db } from '@tamizh/db';
import type { OrderStatus } from '@tamizh/db/enums';

/**
 * Dashboard aggregation.
 *
 * Every figure is computed in SQL against a date window, and each window is
 * paired with the equally-long window before it so the cards can show a
 * comparison rather than a number without context.
 *
 * Cancelled orders are excluded from revenue everywhere — an order that was
 * cancelled was never money.
 */

export type RangeKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'previousMonth'
  | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  /** The equally-long window immediately before, for comparison. */
  previousFrom: Date;
  previousTo: Date;
  key: RangeKey;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/** Resolves a range key (or an explicit pair of dates) into a window. */
export function resolveRange(
  key: RangeKey,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (key) {
    case 'today':
      from = startOfDay(now);
      to = endOfDay(now);
      break;
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      from = startOfDay(yesterday);
      to = endOfDay(yesterday);
      break;
    }
    case 'last7':
      from = startOfDay(new Date(now.getTime() - 6 * 86_400_000));
      to = endOfDay(now);
      break;
    case 'thisMonth':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = endOfDay(now);
      break;
    case 'previousMonth':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case 'custom': {
      const parsedFrom = customFrom ? new Date(customFrom) : null;
      const parsedTo = customTo ? new Date(customTo) : null;
      // Fall back to the last 30 days rather than throwing on a bad URL.
      from =
        parsedFrom && !Number.isNaN(parsedFrom.getTime())
          ? startOfDay(parsedFrom)
          : startOfDay(new Date(now.getTime() - 29 * 86_400_000));
      to =
        parsedTo && !Number.isNaN(parsedTo.getTime()) ? endOfDay(parsedTo) : endOfDay(now);
      break;
    }
    case 'last30':
    default:
      from = startOfDay(new Date(now.getTime() - 29 * 86_400_000));
      to = endOfDay(now);
      break;
  }

  const span = to.getTime() - from.getTime();
  return {
    from,
    to,
    previousFrom: new Date(from.getTime() - span - 1),
    previousTo: new Date(from.getTime() - 1),
    key,
  };
}

export interface DashboardData {
  range: { from: string; to: string; key: RangeKey };
  period: {
    revenue: number;
    orders: number;
    unitsSold: number;
    newCustomers: number;
    averageOrder: number;
  };
  /** Percentage change against the previous window; null when it had nothing. */
  deltas: {
    revenue: number | null;
    orders: number | null;
    newCustomers: number | null;
  };
  attention: {
    pendingOrders: number;
    pendingPayments: number;
    pendingReturns: number;
    lowStock: number;
    outOfStock: number;
  };
  lifetime: {
    revenue: number;
    orders: number;
    customers: number;
    activeProducts: number;
  };
  trend: { date: string; revenue: number; orders: number }[];
  topProducts: {
    id: string;
    name: string;
    sku: string;
    units: number;
    revenue: number;
  }[];
  topCategories: { name: string; units: number; revenue: number }[];
  paymentMethods: { method: string; orders: number; revenue: number }[];
  statusBreakdown: { status: OrderStatus; count: number }[];
  recentOrders: {
    orderNumber: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    placedAt: string;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    sku: string;
    stock: number;
    threshold: number;
  }[];
}

const REVENUE_FILTER = { status: { not: 'CANCELLED' as const } };

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export async function getDashboard(range: DateRange): Promise<DashboardData> {
  const window = { gte: range.from, lte: range.to };
  const previousWindow = { gte: range.previousFrom, lte: range.previousTo };

  const [
    revenueNow,
    revenuePrev,
    ordersPrev,
    unitsAgg,
    newCustomers,
    newCustomersPrev,
    pendingOrders,
    pendingPayments,
    pendingReturns,
    lowStockCount,
    outOfStockCount,
    lifetimeRevenue,
    lifetimeOrders,
    lifetimeCustomers,
    activeProducts,
    trendOrders,
    statusGroups,
    methodGroups,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    db.order.aggregate({
      where: { ...REVENUE_FILTER, placedAt: window },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.order.aggregate({
      where: { ...REVENUE_FILTER, placedAt: previousWindow },
      _sum: { total: true },
    }),
    db.order.count({ where: { ...REVENUE_FILTER, placedAt: previousWindow } }),
    db.orderItem.aggregate({
      where: { order: { ...REVENUE_FILTER, placedAt: window } },
      _sum: { quantity: true },
    }),
    db.user.count({ where: { createdAt: window } }),
    db.user.count({ where: { createdAt: previousWindow } }),
    db.order.count({
      where: { status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'] } },
    }),
    db.order.count({ where: { paymentStatus: { in: ['PENDING', 'AUTHORIZED'] } } }),
    db.returnRequest.count({
      where: { status: { in: ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED'] } },
    }),
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "Product"
      WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE'
        AND "stock" > 0 AND "stock" <= "lowStockThreshold"`,
    db.product.count({ where: { deletedAt: null, status: 'ACTIVE', stock: { lte: 0 } } }),
    db.order.aggregate({ where: REVENUE_FILTER, _sum: { total: true } }),
    db.order.count(),
    db.user.count(),
    db.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    db.order.findMany({
      where: { ...REVENUE_FILTER, placedAt: window },
      select: { placedAt: true, total: true },
    }),
    db.order.groupBy({ by: ['status'], where: { placedAt: window }, _count: { _all: true } }),
    db.order.groupBy({
      by: ['paymentMethod'],
      where: { ...REVENUE_FILTER, placedAt: window },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.order.findMany({
      orderBy: { placedAt: 'desc' },
      take: 8,
      select: {
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        placedAt: true,
      },
    }),
    db.$queryRaw<
      { id: string; name: string; sku: string; stock: number; threshold: number }[]
    >`
      SELECT "id", "name", "sku", "stock", "lowStockThreshold" AS threshold
      FROM "Product"
      WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE'
        AND "stock" <= "lowStockThreshold"
      ORDER BY "stock" ASC
      LIMIT 8`,
  ]);

  // Top products in the window, joined back to product rows for their names.
  const topItemGroups = await db.orderItem.groupBy({
    by: ['productId'],
    where: { order: { ...REVENUE_FILTER, placedAt: window }, productId: { not: null } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: 'desc' } },
    take: 6,
  });

  const topProductRows = await db.product.findMany({
    where: { id: { in: topItemGroups.map((group) => group.productId!).filter(Boolean) } },
    select: { id: true, name: true, sku: true, categoryId: true },
  });
  const productById = new Map(topProductRows.map((row) => [row.id, row]));

  // Categories, aggregated from the same window.
  const categoryItems = await db.orderItem.findMany({
    where: { order: { ...REVENUE_FILTER, placedAt: window }, productId: { not: null } },
    select: {
      quantity: true,
      lineTotal: true,
      product: { select: { category: { select: { name: true } } } },
    },
  });

  const categoryTotals = new Map<string, { units: number; revenue: number }>();
  for (const item of categoryItems) {
    const name = item.product?.category?.name;
    if (!name) continue;
    const entry = categoryTotals.get(name) ?? { units: 0, revenue: 0 };
    entry.units += item.quantity;
    entry.revenue += item.lineTotal;
    categoryTotals.set(name, entry);
  }

  // Daily buckets. Built in JS from one query rather than N queries — the
  // window is at most a few hundred orders for a shop this size.
  const days: { date: string; revenue: number; orders: number }[] = [];
  const cursor = startOfDay(range.from);
  const last = startOfDay(range.to);
  while (cursor <= last && days.length < 400) {
    const next = new Date(cursor.getTime() + 86_400_000);
    const inDay = trendOrders.filter(
      (order) => order.placedAt >= cursor && order.placedAt < next,
    );
    days.push({
      date: cursor.toISOString().slice(0, 10),
      revenue: inDay.reduce((sum, order) => sum + order.total, 0),
      orders: inDay.length,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const revenue = revenueNow._sum.total ?? 0;
  const orders = revenueNow._count._all;

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      key: range.key,
    },
    period: {
      revenue,
      orders,
      unitsSold: unitsAgg._sum.quantity ?? 0,
      newCustomers,
      averageOrder: orders > 0 ? Math.round(revenue / orders) : 0,
    },
    deltas: {
      revenue: percentChange(revenue, revenuePrev._sum.total ?? 0),
      orders: percentChange(orders, ordersPrev),
      newCustomers: percentChange(newCustomers, newCustomersPrev),
    },
    attention: {
      pendingOrders,
      pendingPayments,
      pendingReturns,
      lowStock: Number(lowStockCount[0]?.count ?? 0),
      outOfStock: outOfStockCount,
    },
    lifetime: {
      revenue: lifetimeRevenue._sum.total ?? 0,
      orders: lifetimeOrders,
      customers: lifetimeCustomers,
      activeProducts,
    },
    trend: days,
    topProducts: topItemGroups.map((group) => {
      const product = productById.get(group.productId!);
      return {
        id: group.productId!,
        name: product?.name ?? 'Removed product',
        sku: product?.sku ?? '—',
        units: group._sum.quantity ?? 0,
        revenue: group._sum.lineTotal ?? 0,
      };
    }),
    topCategories: [...categoryTotals.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
    paymentMethods: methodGroups.map((group) => ({
      method: group.paymentMethod,
      orders: group._count._all,
      revenue: group._sum.total ?? 0,
    })),
    statusBreakdown: statusGroups
      .map((group) => ({ status: group.status, count: group._count._all }))
      .sort((a, b) => b.count - a.count),
    recentOrders: recentOrders.map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
      placedAt: order.placedAt.toISOString(),
    })),
    lowStockProducts: lowStockProducts.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      stock: Number(row.stock),
      threshold: Number(row.threshold),
    })),
  };
}
