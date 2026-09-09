import 'server-only';
import { db } from '@tamizh/db';
import type { OrderStatus } from '@tamizh/db/enums';
import type { DateRange } from './dashboard';

/**
 * Reporting.
 *
 * Cancelled orders are excluded from every revenue figure — a shop's takings
 * are what it kept, not what was placed and then undone. Refunds are shown
 * separately rather than netted off silently, so the two questions ("what did
 * we sell?" and "what did we give back?") stay answerable independently.
 *
 * Cost price is stored on the product, so margin here is the margin at the
 * price recorded on the order line against today's cost. That is stated
 * plainly in the UI rather than presented as exact historical cost.
 */

/** Cancelled orders are not takings, so they are out of every revenue figure. */
const EXCLUDED_STATUSES: OrderStatus[] = ['CANCELLED'];

export interface SalesReport {
  totals: {
    orders: number;
    revenue: number;
    units: number;
    averageOrder: number;
    discounts: number;
    shipping: number;
    refunds: number;
    cost: number;
    margin: number;
  };
  byDay: { date: string; revenue: number; orders: number }[];
  byCategory: { name: string; revenue: number; units: number }[];
  byProduct: {
    id: string;
    name: string;
    sku: string;
    units: number;
    revenue: number;
    margin: number;
  }[];
  byPaymentMethod: { method: string; orders: number; revenue: number }[];
  byStatus: { status: string; orders: number; revenue: number }[];
}

export async function getSalesReport(range: DateRange): Promise<SalesReport> {
  const window = { gte: range.from, lte: range.to };
  const where = {
    placedAt: window,
    status: { notIn: EXCLUDED_STATUSES },
  };

  const [orders, items, refunds] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        id: true,
        placedAt: true,
        total: true,
        subtotal: true,
        discountTotal: true,
        shippingFee: true,
        paymentMethod: true,
        status: true,
      },
    }),
    db.orderItem.findMany({
      where: { order: where },
      select: {
        quantity: true,
        lineTotal: true,
        unitPrice: true,
        name: true,
        sku: true,
        productId: true,
        product: {
          select: { id: true, costPrice: true, category: { select: { name: true } } },
        },
      },
    }),
    db.refund.aggregate({
      where: { status: 'COMPLETED', processedAt: window },
      _sum: { amount: true },
    }),
  ]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const cost = items.reduce(
    (sum, item) => sum + (item.product?.costPrice ?? 0) * item.quantity,
    0,
  );
  const merchandise = items.reduce((sum, item) => sum + item.lineTotal, 0);

  // -- by day ---------------------------------------------------------------
  const days = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const key = order.placedAt.toISOString().slice(0, 10);
    const entry = days.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += order.total;
    entry.orders += 1;
    days.set(key, entry);
  }

  // Fill the gaps so a quiet Tuesday reads as zero rather than disappearing.
  const byDay: SalesReport['byDay'] = [];
  for (
    let cursor = new Date(range.from);
    cursor <= range.to;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = days.get(key);
    byDay.push({ date: key, revenue: entry?.revenue ?? 0, orders: entry?.orders ?? 0 });
  }

  // -- by category ----------------------------------------------------------
  const categories = new Map<string, { revenue: number; units: number }>();
  for (const item of items) {
    const name = item.product?.category?.name ?? 'Uncategorised';
    const entry = categories.get(name) ?? { revenue: 0, units: 0 };
    entry.revenue += item.lineTotal;
    entry.units += item.quantity;
    categories.set(name, entry);
  }

  // -- by product -----------------------------------------------------------
  const products = new Map<
    string,
    { id: string; name: string; sku: string; units: number; revenue: number; margin: number }
  >();
  for (const item of items) {
    const key = item.productId ?? item.sku;
    const entry =
      products.get(key) ??
      { id: item.product?.id ?? '', name: item.name, sku: item.sku, units: 0, revenue: 0, margin: 0 };
    entry.units += item.quantity;
    entry.revenue += item.lineTotal;
    entry.margin += (item.unitPrice - (item.product?.costPrice ?? 0)) * item.quantity;
    products.set(key, entry);
  }

  // -- by payment method and status ----------------------------------------
  const methods = new Map<string, { orders: number; revenue: number }>();
  const statuses = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const method = methods.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
    method.orders += 1;
    method.revenue += order.total;
    methods.set(order.paymentMethod, method);

    const status = statuses.get(order.status) ?? { orders: 0, revenue: 0 };
    status.orders += 1;
    status.revenue += order.total;
    statuses.set(order.status, status);
  }

  return {
    totals: {
      orders: orders.length,
      revenue,
      units,
      averageOrder: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
      discounts: orders.reduce((sum, order) => sum + order.discountTotal, 0),
      shipping: orders.reduce((sum, order) => sum + order.shippingFee, 0),
      refunds: refunds._sum.amount ?? 0,
      cost,
      margin: merchandise - cost,
    },
    byDay,
    byCategory: [...categories.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.revenue - a.revenue),
    byProduct: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 50),
    byPaymentMethod: [...methods.entries()].map(([method, value]) => ({ method, ...value })),
    byStatus: [...statuses.entries()].map(([status, value]) => ({ status, ...value })),
  };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Escapes one CSV cell.
 *
 * The leading apostrophe on values starting with `=`, `+`, `-` or `@` stops a
 * spreadsheet treating an exported field as a formula — the classic way a CSV
 * export turns into code execution on someone else's machine.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  // A BOM so Excel opens Tamil product names correctly instead of as mojibake.
  return `﻿${lines.join('\r\n')}\r\n`;
}

const rupees = (paise: number) => (paise / 100).toFixed(2);

export async function ordersCsv(range: DateRange): Promise<string> {
  const orders = await db.order.findMany({
    where: { placedAt: { gte: range.from, lte: range.to } },
    orderBy: { placedAt: 'asc' },
    select: {
      orderNumber: true,
      placedAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      customerName: true,
      city: true,
      district: true,
      pincode: true,
      subtotal: true,
      discountTotal: true,
      shippingFee: true,
      total: true,
      couponCode: true,
      items: { select: { quantity: true } },
    },
  });

  // Deliberately no email, phone or street address: an exported spreadsheet
  // travels further than the panel does, and a fulfilment report does not need
  // to carry a customer's contact details with it.
  return toCsv(
    [
      'Order',
      'Placed',
      'Status',
      'Payment',
      'Method',
      'Customer',
      'City',
      'District',
      'PIN',
      'Items',
      'Subtotal',
      'Discount',
      'Delivery',
      'Total',
      'Coupon',
    ],
    orders.map((order) => [
      order.orderNumber,
      order.placedAt.toISOString(),
      order.status,
      order.paymentStatus,
      order.paymentMethod,
      order.customerName,
      order.city,
      order.district,
      order.pincode,
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      rupees(order.subtotal),
      rupees(order.discountTotal),
      rupees(order.shippingFee),
      rupees(order.total),
      order.couponCode ?? '',
    ]),
  );
}

export async function inventoryCsv(): Promise<string> {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      sku: true,
      name: true,
      brand: true,
      status: true,
      stock: true,
      reservedStock: true,
      lowStockThreshold: true,
      price: true,
      costPrice: true,
      soldCount: true,
      category: { select: { name: true } },
    },
  });

  return toCsv(
    [
      'SKU',
      'Name',
      'Brand',
      'Category',
      'Status',
      'On hand',
      'Reserved',
      'Available',
      'Threshold',
      'Price',
      'Cost',
      'Stock value at cost',
      'Sold',
    ],
    products.map((product) => [
      product.sku,
      product.name,
      product.brand,
      product.category.name,
      product.status,
      product.stock,
      product.reservedStock,
      product.stock - product.reservedStock,
      product.lowStockThreshold,
      rupees(product.price),
      rupees(product.costPrice),
      rupees(product.costPrice * product.stock),
      product.soldCount,
    ]),
  );
}

export async function salesCsv(range: DateRange): Promise<string> {
  const report = await getSalesReport(range);
  return toCsv(
    ['Date', 'Orders', 'Revenue'],
    report.byDay.map((day) => [day.date, day.orders, rupees(day.revenue)]),
  );
}

export async function productsCsv(range: DateRange): Promise<string> {
  const report = await getSalesReport(range);
  return toCsv(
    ['SKU', 'Product', 'Units', 'Revenue', 'Margin'],
    report.byProduct.map((product) => [
      product.sku,
      product.name,
      product.units,
      rupees(product.revenue),
      rupees(product.margin),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Customer interest
// ---------------------------------------------------------------------------

/**
 * What customers want but have not bought.
 *
 * A wishlist is the cheapest demand signal a shop has: it names the products
 * people came for, and pairing that with stock says which of them the shop is
 * currently failing to sell. A wishlisted item that is out of stock is a sale
 * waiting to be lost.
 */
export interface InterestReport {
  wishlisted: {
    id: string;
    name: string;
    sku: string;
    count: number;
    stock: number;
    price: number;
  }[];
  abandonedCarts: { carts: number; value: number; items: number };
  newCustomers: number;
  repeatCustomers: number;
}

export async function getInterestReport(range: DateRange): Promise<InterestReport> {
  const [wishlistRows, carts, newCustomers, repeatRows] = await Promise.all([
    db.wishlistItem.groupBy({
      by: ['productId'],
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 10,
    }),
    // A cart that has not been touched in a day, and never became an order.
    db.cart.findMany({
      where: {
        updatedAt: { lt: new Date(Date.now() - 86_400_000) },
        items: { some: {} },
      },
      select: {
        items: { select: { quantity: true, product: { select: { price: true } } } },
      },
      take: 500,
    }),
    db.user.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
    db.order.groupBy({
      by: ['userId'],
      where: { userId: { not: null }, status: { notIn: EXCLUDED_STATUSES } },
      _count: { _all: true },
    }),
  ]);

  const products =
    wishlistRows.length > 0
      ? await db.product.findMany({
          where: { id: { in: wishlistRows.map((row) => row.productId) } },
          select: { id: true, name: true, sku: true, stock: true, price: true },
        })
      : [];

  const byId = new Map(products.map((product) => [product.id, product]));

  return {
    wishlisted: wishlistRows
      .map((row) => {
        const product = byId.get(row.productId);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          count: row._count._all,
          stock: product.stock,
          price: product.price,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
    abandonedCarts: {
      carts: carts.length,
      items: carts.reduce(
        (sum, cart) => sum + cart.items.reduce((count, item) => count + item.quantity, 0),
        0,
      ),
      value: carts.reduce(
        (sum, cart) =>
          sum +
          cart.items.reduce(
            (total, item) => total + (item.product?.price ?? 0) * item.quantity,
            0,
          ),
        0,
      ),
    },
    newCustomers,
    repeatCustomers: repeatRows.filter((row) => row._count._all > 1).length,
  };
}
