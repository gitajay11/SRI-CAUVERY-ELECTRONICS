import 'server-only';
import { db } from '@tamizh/db';
import type { PaymentStatus, RefundStatus, ReturnStatus } from '@tamizh/db/enums';
import { AppError, notFound } from '@tamizh/core/api';
import { recordAudit } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';
import { notifyStaff } from './notifications';

/**
 * Payments, returns and refunds.
 *
 * The rules that matter here are about money leaving the business:
 *
 *  - A refund is never for more than the order was paid, minus what has
 *    already been refunded. That ceiling is computed here from stored rows,
 *    never taken from the browser.
 *  - Approving a refund and marking it paid are two separate steps by two
 *    separate permissions, so the person who authorises money going out is not
 *    automatically the person who says it went.
 *  - Returned goods only go back on the shelf when someone has inspected them
 *    and said so, and that restock writes an inventory movement like any
 *    other.
 */

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface PaymentFilters {
  q?: string;
  status?: PaymentStatus | 'ALL';
  provider?: string;
  page: number;
  pageSize: number;
}

export async function listPayments(filters: PaymentFilters) {
  const and: Record<string, unknown>[] = [];

  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });
  if (filters.provider) and.push({ provider: filters.provider });
  if (filters.q) {
    and.push({
      OR: [
        { providerPaymentId: { contains: filters.q, mode: 'insensitive' } },
        { providerOrderId: { contains: filters.q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: filters.q, mode: 'insensitive' } } },
        { order: { customerName: { contains: filters.q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows, totals] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        provider: true,
        providerPaymentId: true,
        amount: true,
        status: true,
        failureReason: true,
        paidAt: true,
        createdAt: true,
        order: {
          select: { orderNumber: true, customerName: true, paymentMethod: true },
        },
        refunds: { select: { amount: true, status: true } },
      },
    }),
    db.payment.groupBy({ by: ['status'], _sum: { amount: true }, _count: { _all: true } }),
  ]);

  return {
    total,
    summary: totals.map((row) => ({
      status: row.status,
      amount: row._sum.amount ?? 0,
      count: row._count._all,
    })),
    rows: rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      reference: row.providerPaymentId,
      amount: row.amount,
      status: row.status,
      failureReason: row.failureReason,
      paidAt: row.paidAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      orderNumber: row.order.orderNumber,
      customerName: row.order.customerName,
      method: row.order.paymentMethod,
      refunded: row.refunds
        .filter((refund) => refund.status === 'COMPLETED')
        .reduce((sum, refund) => sum + refund.amount, 0),
    })),
  };
}

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

/**
 * Where a return can go next.
 *
 * Rejected and closed are ends of the road. A refund is only offered once the
 * goods are actually back — approving a return is a promise to accept them,
 * not a promise to pay.
 */
export const RETURN_FLOW: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKUP_SCHEDULED', 'RECEIVED', 'REJECTED'],
  PICKUP_SCHEDULED: ['RECEIVED', 'REJECTED'],
  RECEIVED: ['REFUND_PENDING', 'CLOSED'],
  REFUND_PENDING: ['REFUNDED', 'CLOSED'],
  REFUNDED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

export interface ReturnFilters {
  q?: string;
  status?: ReturnStatus | 'ALL';
  page: number;
  pageSize: number;
}

export async function listReturns(filters: ReturnFilters) {
  const and: Record<string, unknown>[] = [];
  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });
  if (filters.q) {
    and.push({
      OR: [
        { returnNumber: { contains: filters.q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: filters.q, mode: 'insensitive' } } },
        { order: { customerName: { contains: filters.q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows, open] = await Promise.all([
    db.returnRequest.count({ where }),
    db.returnRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        returnNumber: true,
        reason: true,
        status: true,
        requestedAt: true,
        order: { select: { orderNumber: true, customerName: true, total: true } },
        items: { select: { quantity: true } },
        handledBy: { select: { name: true } },
      },
    }),
    db.returnRequest.count({
      where: { status: { in: ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED'] } },
    }),
  ]);

  return {
    total,
    open,
    rows: rows.map((row) => ({
      id: row.id,
      returnNumber: row.returnNumber,
      reason: row.reason,
      status: row.status,
      requestedAt: row.requestedAt.toISOString(),
      orderNumber: row.order.orderNumber,
      customerName: row.order.customerName,
      orderTotal: row.order.total,
      units: row.items.reduce((sum, item) => sum + item.quantity, 0),
      handledBy: row.handledBy?.name ?? null,
    })),
  };
}

export async function getReturn(returnNumber: string) {
  const request = await db.returnRequest.findUnique({
    where: { returnNumber },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          deliveredAt: true,
        },
      },
      items: {
        include: {
          orderItem: {
            select: { id: true, name: true, sku: true, unitPrice: true, quantity: true },
          },
          product: { select: { id: true, name: true, stock: true } },
        },
      },
      refunds: {
        orderBy: { requestedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          reason: true,
          method: true,
          reference: true,
          requestedAt: true,
          processedAt: true,
          approvedBy: { select: { name: true } },
        },
      },
      handledBy: { select: { name: true } },
    },
  });
  if (!request) return null;

  const refundableValue = request.items.reduce(
    (sum, item) => sum + item.orderItem.unitPrice * item.quantity,
    0,
  );

  return { ...request, refundableValue };
}

export interface ReturnDecision {
  status: ReturnStatus;
  note?: string;
  /** Only meaningful on RECEIVED: what to do with each line's goods. */
  outcomes?: { returnItemId: string; outcome: 'RESTOCK' | 'DAMAGED' }[];
  pickupAt?: string;
}

/**
 * Moves a return along.
 *
 * Restocking happens exactly once, when the goods are marked received and a
 * line is judged resaleable — and it writes an inventory movement, so returned
 * stock is as traceable as bought stock.
 */
export async function progressReturn(
  actor: AdminIdentity,
  returnNumber: string,
  decision: ReturnDecision,
) {
  const request = await db.returnRequest.findUnique({
    where: { returnNumber },
    select: {
      id: true,
      status: true,
      returnNumber: true,
      orderId: true,
      order: { select: { orderNumber: true } },
      items: { select: { id: true, productId: true, quantity: true, outcome: true } },
    },
  });
  if (!request) throw notFound('Return request not found.');

  const allowed = RETURN_FLOW[request.status];
  if (!allowed.includes(decision.status)) {
    throw new AppError(
      `A return that is ${request.status} cannot move to ${decision.status}.`,
      422,
      'invalid_transition',
      { status: 'Choose one of the offered next steps.' },
    );
  }
  if (decision.status === 'REJECTED' && !decision.note?.trim()) {
    throw new AppError('Say why the return is being rejected.', 422, 'reason_required', {
      note: 'A reason is required.',
    });
  }

  await db.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: request.id },
      data: {
        status: decision.status,
        decisionNote: decision.note?.trim() || undefined,
        handledById: actor.id,
        pickupScheduledAt:
          decision.status === 'PICKUP_SCHEDULED' && decision.pickupAt
            ? new Date(decision.pickupAt)
            : undefined,
        receivedAt: decision.status === 'RECEIVED' ? new Date() : undefined,
      },
    });

    if (decision.status === 'RECEIVED' && decision.outcomes) {
      for (const outcome of decision.outcomes) {
        const line = request.items.find((item) => item.id === outcome.returnItemId);
        // A line already judged is left alone: restocking twice would invent
        // stock that never came back.
        if (!line || line.outcome) continue;

        await tx.returnItem.update({
          where: { id: line.id },
          data: { outcome: outcome.outcome },
        });

        if (outcome.outcome !== 'RESTOCK' || !line.productId) continue;

        const product = await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: line.quantity } },
          select: { stock: true },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: line.productId,
            change: line.quantity,
            quantityBefore: product.stock - line.quantity,
            quantityAfter: product.stock,
            reason: 'CUSTOMER_RETURN',
            note: `Return ${request.returnNumber}`,
            orderId: request.orderId,
            actorId: actor.id,
          },
        });
      }
    }

    await recordAudit(
      actor,
      {
        action:
          decision.status === 'APPROVED'
            ? 'return.approved'
            : decision.status === 'REJECTED'
              ? 'return.rejected'
              : decision.status === 'RECEIVED'
                ? 'return.received'
                : 'return.closed',
        entityType: 'ReturnRequest',
        entityId: request.id,
        summary: `${request.returnNumber} (${request.order.orderNumber}): ${request.status} → ${decision.status}`,
        changes: { status: { from: request.status, to: decision.status } },
      },
      tx,
    );
  });

  return { status: decision.status };
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export interface RefundFilters {
  q?: string;
  status?: RefundStatus | 'ALL';
  page: number;
  pageSize: number;
}

export async function listRefunds(filters: RefundFilters) {
  const and: Record<string, unknown>[] = [];
  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });
  if (filters.q) {
    and.push({
      OR: [
        { order: { orderNumber: { contains: filters.q, mode: 'insensitive' } } },
        { order: { customerName: { contains: filters.q, mode: 'insensitive' } } },
        { reference: { contains: filters.q, mode: 'insensitive' } },
      ],
    });
  }

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows, pending, paidOut] = await Promise.all([
    db.refund.count({ where }),
    db.refund.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        method: true,
        reference: true,
        requestedAt: true,
        processedAt: true,
        order: { select: { orderNumber: true, customerName: true, paymentMethod: true } },
        returnRequest: { select: { returnNumber: true } },
        approvedBy: { select: { name: true } },
      },
    }),
    db.refund.count({ where: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } } }),
    db.refund.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
  ]);

  return {
    total,
    pending,
    paidOut: paidOut._sum.amount ?? 0,
    rows: rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      reason: row.reason,
      status: row.status,
      method: row.method,
      reference: row.reference,
      requestedAt: row.requestedAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
      orderNumber: row.order.orderNumber,
      customerName: row.order.customerName,
      paymentMethod: row.order.paymentMethod,
      returnNumber: row.returnRequest?.returnNumber ?? null,
      approvedBy: row.approvedBy?.name ?? null,
    })),
  };
}

/**
 * What is still refundable on an order.
 *
 * Everything already refunded, or on its way to being refunded, is subtracted;
 * only a rejected or failed refund frees its amount up again.
 */
export async function refundableAmount(orderId: string): Promise<{
  paid: number;
  refunded: number;
  available: number;
}> {
  const [order, refunds] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      select: { total: true, paymentStatus: true },
    }),
    db.refund.findMany({
      where: { orderId, status: { notIn: ['REJECTED', 'FAILED'] } },
      select: { amount: true },
    }),
  ]);
  if (!order) throw notFound('Order not found.');

  const paid = order.paymentStatus === 'PENDING' ? 0 : order.total;
  const refunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);
  return { paid, refunded, available: Math.max(0, paid - refunded) };
}

export interface RefundRequestInput {
  orderId: string;
  returnRequestId?: string | null;
  /** Paise. */
  amount: number;
  reason: string;
}

export async function requestRefund(actor: AdminIdentity, input: RefundRequestInput) {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paymentStatus: true,
      payments: {
        where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!order) throw notFound('Order not found.');

  const { available } = await refundableAmount(order.id);
  if (input.amount <= 0) {
    throw new AppError('Enter an amount to refund.', 422, 'invalid_amount', {
      amount: 'Enter an amount above zero.',
    });
  }
  if (input.amount > available) {
    throw new AppError(
      'That is more than is left to refund on this order.',
      422,
      'exceeds_refundable',
      { amount: 'More than the refundable balance.' },
    );
  }

  const refund = await db.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        orderId: order.id,
        paymentId: order.payments[0]?.id ?? null,
        returnRequestId: input.returnRequestId ?? null,
        amount: input.amount,
        reason: input.reason.trim(),
        status: 'PENDING',
      },
      select: { id: true, amount: true },
    });

    await recordAudit(
      actor,
      {
        action: 'refund.requested',
        entityType: 'Refund',
        entityId: created.id,
        summary: `Refund of ₹${(created.amount / 100).toFixed(2)} requested on ${order.orderNumber}`,
      },
      tx,
    );

    return created;
  });

  await notifyStaff({
    type: 'REFUND_REQUESTED',
    title: 'Refund awaiting approval',
    body: `${order.orderNumber} — ₹${(refund.amount / 100).toFixed(2)}`,
    url: '/refunds',
    entityType: 'Refund',
    entityId: refund.id,
    tag: 'refund',
  });

  return refund;
}

/**
 * Approves, rejects, or settles a refund.
 *
 * Only a settled refund changes the order's payment status, and it is written
 * in the same transaction — an order must never read as refunded while the
 * money is still sitting in the business.
 */
export async function decideRefund(
  actor: AdminIdentity,
  id: string,
  decision: {
    status: Extract<RefundStatus, 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>;
    note?: string;
    method?: string;
    reference?: string;
  },
) {
  const refund = await db.refund.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      status: true,
      orderId: true,
      returnRequestId: true,
      order: { select: { orderNumber: true, total: true } },
    },
  });
  if (!refund) throw notFound('Refund not found.');

  const flow: Record<RefundStatus, RefundStatus[]> = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSING', 'COMPLETED', 'FAILED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    REJECTED: [],
    COMPLETED: [],
    FAILED: ['PROCESSING', 'COMPLETED'],
  };
  if (!flow[refund.status].includes(decision.status)) {
    throw new AppError(
      `A refund that is ${refund.status} cannot move to ${decision.status}.`,
      422,
      'invalid_transition',
    );
  }
  if (decision.status === 'REJECTED' && !decision.note?.trim()) {
    throw new AppError('Say why the refund is being rejected.', 422, 'reason_required', {
      note: 'A reason is required.',
    });
  }
  if (decision.status === 'COMPLETED' && !decision.reference?.trim()) {
    throw new AppError(
      'Record the payment reference before marking a refund paid.',
      422,
      'reference_required',
      { reference: 'Enter the transaction reference.' },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id },
      data: {
        status: decision.status,
        approvedById: actor.id,
        method: decision.method?.trim() || undefined,
        reference: decision.reference?.trim() || undefined,
        processedAt: decision.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    if (decision.status === 'COMPLETED') {
      const settled = await tx.refund.aggregate({
        where: { orderId: refund.orderId, status: 'COMPLETED' },
        _sum: { amount: true },
      });
      const refundedTotal = settled._sum.amount ?? 0;
      const fullyRefunded = refundedTotal >= refund.order.total;
      const paymentStatus: PaymentStatus = fullyRefunded
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED';

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          // A part-refunded order is still a delivered order — only a full
          // refund undoes it. Saying otherwise would hide delivered orders
          // from fulfilment reports over a ₹50 goodwill refund.
          status: fullyRefunded ? 'REFUNDED' : undefined,
          paymentStatus,
        },
      });
      await tx.payment.updateMany({
        where: { orderId: refund.orderId, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
        data: { status: paymentStatus },
      });

      if (refund.returnRequestId) {
        await tx.returnRequest.update({
          where: { id: refund.returnRequestId },
          data: { status: 'REFUNDED' },
        });
      }

      await tx.orderEvent.create({
        data: {
          orderId: refund.orderId,
          status: 'REFUNDED',
          message: `Refund of ₹${(refund.amount / 100).toFixed(2)} paid — ${decision.reference}`,
          actorId: actor.id,
        },
      });
    }

    await recordAudit(
      actor,
      {
        action:
          decision.status === 'APPROVED'
            ? 'refund.approved'
            : decision.status === 'REJECTED'
              ? 'refund.rejected'
              : 'refund.completed',
        entityType: 'Refund',
        entityId: id,
        summary: `${refund.order.orderNumber}: refund ${refund.status} → ${decision.status}${
          decision.note ? ` — ${decision.note}` : ''
        }`,
        changes: { status: { from: refund.status, to: decision.status } },
      },
      tx,
    );
  });

  return { status: decision.status };
}
