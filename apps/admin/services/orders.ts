import 'server-only';
import { db } from '@tamizh/db';
import type { OrderStatus, PaymentStatus } from '@tamizh/db/enums';
import { AppError, notFound } from '@tamizh/core/api';
import { canTransition } from '@tamizh/core/pricing';
import { recordAudit } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Order operations.
 *
 * Two invariants hold across everything here:
 *
 *  1. A status change never happens on its own. Moving an order writes a
 *     timeline event, and — where the status implies it — returns stock,
 *     settles a cash-on-delivery payment, or stamps a delivery date. All of it
 *     inside one transaction, so an order can never end up delivered with its
 *     stock still reserved.
 *
 *  2. Transitions are validated against the state machine in @tamizh/core, so
 *     an order cannot jump from "pending" to "delivered" and skip the side
 *     effects attached to the steps in between.
 */

export interface OrderFilters {
  q?: string;
  status?: OrderStatus | 'ALL';
  paymentStatus?: PaymentStatus | 'ALL';
  method?: 'COD' | 'ONLINE' | 'ALL';
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface OrderListRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD' | 'ONLINE';
  placedAt: string;
}

function buildWhere(filters: OrderFilters) {
  const and: Record<string, unknown>[] = [];

  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });
  if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
    and.push({ paymentStatus: filters.paymentStatus });
  }
  if (filters.method && filters.method !== 'ALL') {
    and.push({ paymentMethod: filters.method });
  }
  if (filters.from || filters.to) {
    and.push({
      placedAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }

  if (filters.q) {
    const term = filters.q.trim();
    and.push({
      OR: [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term } },
        { customerEmail: { contains: term, mode: 'insensitive' } },
        // Searching by what was bought, not only by who bought it.
        { items: { some: { sku: { contains: term, mode: 'insensitive' } } } },
        { items: { some: { name: { contains: term, mode: 'insensitive' } } } },
      ],
    });
  }

  return (and.length > 0 ? { AND: and } : {}) as never;
}

export async function listOrders(filters: OrderFilters): Promise<{
  rows: OrderListRow[];
  total: number;
}> {
  const where = buildWhere(filters);

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        total: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        placedAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      itemCount: row._count.items,
      total: row.total,
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod,
      placedAt: row.placedAt.toISOString(),
    })),
  };
}

export async function getOrderDetail(orderNumber: string) {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: { product: { select: { slug: true, stock: true } } },
        orderBy: { name: 'asc' },
      },
      payments: { orderBy: { createdAt: 'desc' } },
      refunds: { orderBy: { requestedAt: 'desc' } },
      returnRequests: {
        include: { items: true },
        orderBy: { requestedAt: 'desc' },
      },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      internalNotes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) return null;

  // Margin is derived, never stored on the order as a denormalised figure that
  // could drift from the line items it came from.
  const revenue = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const cost = order.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);

  return {
    ...order,
    margin: { revenue, cost, profit: revenue - cost },
    refundedTotal: order.refunds
      .filter((refund) => refund.status === 'COMPLETED')
      .reduce((sum, refund) => sum + refund.amount, 0),
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;

/**
 * Moves an order to a new status.
 *
 * Everything the new status implies happens in the same transaction:
 *   CANCELLED   returns stock and records why
 *   DELIVERED   stamps the delivery date and settles a COD payment
 *   SHIPPED     stamps the dispatch date
 */
export async function updateOrderStatus(
  actor: AdminIdentity,
  orderNumber: string,
  input: {
    status: OrderStatus;
    trackingNumber?: string;
    courier?: string;
    note?: string;
    cancelReason?: string;
  },
) {
  const updated = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    if (!order) throw notFound('Order not found.');

    const changingStatus = input.status !== order.status;
    if (changingStatus && !canTransition(order.status, input.status)) {
      throw new AppError(
        `An order that is ${order.status.toLowerCase().replace(/_/g, ' ')} cannot move to ${input.status
          .toLowerCase()
          .replace(/_/g, ' ')}.`,
        409,
        'invalid_transition',
      );
    }

    if (changingStatus && input.status === 'CANCELLED') {
      if (!input.cancelReason?.trim()) {
        throw new AppError(
          'A reason is required when cancelling an order.',
          422,
          'reason_required',
          { cancelReason: 'Tell us why this is being cancelled.' },
        );
      }

      // Put the goods back, and record each movement so the ledger balances.
      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });
        if (!product) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            change: item.quantity,
            quantityBefore: product.stock,
            quantityAfter: product.stock + item.quantity,
            reason: 'CANCELLED_ORDER',
            note: `Order ${order.orderNumber} cancelled`,
            actorId: actor.id,
            orderId: order.id,
          },
        });
      }
    }

    const now = new Date();
    const result = await tx.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        trackingNumber:
          input.trackingNumber === undefined
            ? order.trackingNumber
            : input.trackingNumber || null,
        courier: input.courier === undefined ? order.courier : input.courier || null,
        cancelReason:
          input.status === 'CANCELLED' ? (input.cancelReason ?? null) : order.cancelReason,
        confirmedAt:
          input.status === 'CONFIRMED' && !order.confirmedAt ? now : order.confirmedAt,
        shippedAt: input.status === 'SHIPPED' && !order.shippedAt ? now : order.shippedAt,
        deliveredAt: input.status === 'DELIVERED' ? now : order.deliveredAt,
        cancelledAt: input.status === 'CANCELLED' ? now : order.cancelledAt,
        // Cash is collected on the doorstep, so delivery is the moment a COD
        // order becomes paid.
        paymentStatus:
          input.status === 'DELIVERED' && order.paymentMethod === 'COD'
            ? 'PAID'
            : order.paymentStatus,
      },
    });

    if (changingStatus) {
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: input.status,
          message: input.note?.trim() || null,
          actorId: actor.id,
        },
      });

      if (input.status === 'DELIVERED' && order.paymentMethod === 'COD') {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: { in: ['PENDING', 'COD_PENDING'] } },
          data: { status: 'PAID', paidAt: now },
        });
      }
    }

    await recordAudit(
      actor,
      {
        action: input.status === 'CANCELLED' ? 'order.cancelled' : 'order.status_changed',
        entityType: 'Order',
        entityId: order.id,
        summary: `Order ${order.orderNumber}: ${order.status} → ${input.status}`,
        changes: changingStatus
          ? { status: { from: order.status, to: input.status } }
          : {},
      },
      tx,
    );

    return result;
  });

  return updated;
}

export async function addOrderNote(
  actor: AdminIdentity,
  orderNumber: string,
  body: string,
) {
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { id: true, orderNumber: true },
  });
  if (!order) throw notFound('Order not found.');

  const note = await db.$transaction(async (tx) => {
    const created = await tx.orderNote.create({
      data: { orderId: order.id, body: body.trim(), authorId: actor.id },
      include: { author: { select: { name: true } } },
    });
    await recordAudit(
      actor,
      {
        action: 'order.note_added',
        entityType: 'Order',
        entityId: order.id,
        summary: `Note added to order ${order.orderNumber}`,
      },
      tx,
    );
    return created;
  });

  return note;
}
