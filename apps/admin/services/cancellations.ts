import 'server-only';
import { db } from '@tamizh/db';
import type { CancellationStatus } from '@tamizh/db/enums';
import { AppError, notFound } from '@tamizh/core/api';
import { CANCELLABLE_STATUSES } from '@tamizh/core/pricing';
import { recordAudit } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';
import { refundableAmount, requestRefund } from './money';
import { updateOrderStatusWithin } from './orders';

/**
 * Customer cancellation requests.
 *
 * A request changes nothing by itself. It is the shop's decision that moves
 * goods and money, and it does so through the paths that already exist for
 * exactly those movements:
 *
 *  - Approving cancels the order the way staff cancel any order — stock back
 *    on the shelf with a ledger row, an order event, an audit entry — and,
 *    where money had been taken, raises a refund into the refunds queue. The
 *    refund still needs its own approval by someone with that permission; a
 *    cancellation never lets money out by itself.
 *  - Rejecting records why, so the customer can read it on their order, and
 *    leaves the order exactly as it was.
 *
 * Both are decided once. A request that has already been decided cannot be
 * decided again, however many times the button is pressed.
 */

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export interface CancellationFilters {
  q?: string;
  status?: CancellationStatus | 'ALL';
  page: number;
  pageSize: number;
}

export async function listCancellations(filters: CancellationFilters) {
  const and: Record<string, unknown>[] = [];
  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });
  if (filters.q) {
    and.push({
      OR: [
        { requestNumber: { contains: filters.q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: filters.q, mode: 'insensitive' } } },
        { order: { customerName: { contains: filters.q, mode: 'insensitive' } } },
        { order: { customerPhone: { contains: filters.q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows, open] = await Promise.all([
    db.cancellationRequest.count({ where }),
    db.cancellationRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        requestNumber: true,
        reason: true,
        status: true,
        requestedAt: true,
        handledAt: true,
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            total: true,
            status: true,
            paymentStatus: true,
            placedAt: true,
          },
        },
        handledBy: { select: { name: true } },
      },
    }),
    db.cancellationRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    total,
    open,
    rows: rows.map((row) => ({
      id: row.id,
      requestNumber: row.requestNumber,
      reason: row.reason,
      status: row.status,
      requestedAt: row.requestedAt.toISOString(),
      handledAt: row.handledAt?.toISOString() ?? null,
      orderNumber: row.order.orderNumber,
      orderStatus: row.order.status,
      orderPlacedAt: row.order.placedAt.toISOString(),
      paymentStatus: row.order.paymentStatus,
      customerName: row.order.customerName,
      customerPhone: row.order.customerPhone,
      orderTotal: row.order.total,
      handledBy: row.handledBy?.name ?? null,
    })),
  };
}

export async function getCancellation(requestNumber: string) {
  const request = await db.cancellationRequest.findUnique({
    where: { requestNumber },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          total: true,
          placedAt: true,
          items: {
            select: { id: true, name: true, sku: true, quantity: true, unitPrice: true },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
      handledBy: { select: { name: true } },
    },
  });
  if (!request) return null;

  const refund = request.refundId
    ? await db.refund.findUnique({
        where: { id: request.refundId },
        select: { id: true, amount: true, status: true },
      })
    : null;

  return {
    ...request,
    refund,
    // Whether approving would still be possible: the order may have moved
    // on (shipped, say) while the request sat in the queue.
    orderStillCancellable: (CANCELLABLE_STATUSES as readonly string[]).includes(
      request.order.status,
    ),
  };
}

// ---------------------------------------------------------------------------
// Deciding
// ---------------------------------------------------------------------------

export interface CancellationDecision {
  status: 'APPROVED' | 'REJECTED';
  /** Staff's note. Required when rejecting; the customer reads it. */
  note?: string;
}

export async function decideCancellation(
  actor: AdminIdentity,
  requestNumber: string,
  decision: CancellationDecision,
) {
  const note = decision.note?.trim() || '';
  if (decision.status === 'REJECTED' && note.length < 3) {
    throw new AppError(
      'Tell the customer why the request was declined.',
      422,
      'reason_required',
      { note: 'A reason is required when rejecting.' },
    );
  }

  const outcome = await db.$transaction(async (tx) => {
    // Claim the request first. `updateMany` with the status in the WHERE is
    // the atomic step: of two staff pressing Approve together, exactly one
    // update matches a PENDING row, and the other learns it was too late.
    const claimed = await tx.cancellationRequest.updateMany({
      where: { requestNumber, status: 'PENDING' },
      data: {
        status: decision.status,
        decisionNote: note || null,
        handledById: actor.id,
        handledAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      const existing = await tx.cancellationRequest.findUnique({
        where: { requestNumber },
        select: { status: true },
      });
      if (!existing) throw notFound('Cancellation request not found.');
      throw new AppError(
        `This request has already been ${existing.status.toLowerCase()}.`,
        409,
        'already_decided',
      );
    }

    const request = await tx.cancellationRequest.findUniqueOrThrow({
      where: { requestNumber },
      select: {
        id: true,
        reason: true,
        order: {
          select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true },
        },
      },
    });

    if (decision.status === 'REJECTED') {
      // The order is untouched. The customer hears about it through the
      // order's own timeline, which is where they already look for news.
      await tx.orderEvent.create({
        data: {
          orderId: request.order.id,
          status: request.order.status,
          message: `Cancellation request declined: ${note}`,
          actorId: actor.id,
        },
      });

      await recordAudit(
        actor,
        {
          action: 'cancellation.rejected',
          entityType: 'CancellationRequest',
          entityId: request.id,
          summary: `Cancellation ${requestNumber} on ${request.order.orderNumber} rejected`,
        },
        tx,
      );

      return { request, refundRaised: null };
    }

    // Approved: cancel the order exactly as staff would by hand. This throws
    // — and rolls the claim back with it — if the order has moved past the
    // point of cancelling since the customer asked.
    await updateOrderStatusWithin(tx, actor, request.order.orderNumber, {
      status: 'CANCELLED',
      cancelReason: `Customer request ${requestNumber}: ${request.reason}`,
      note: note ? `Cancellation approved — ${note}` : 'Cancellation approved at customer request',
    });

    await recordAudit(
      actor,
      {
        action: 'cancellation.approved',
        entityType: 'CancellationRequest',
        entityId: request.id,
        summary: `Cancellation ${requestNumber} on ${request.order.orderNumber} approved`,
      },
      tx,
    );

    return { request, refundRaised: request.order.paymentStatus === 'PAID' };
  });

  // Money taken? Raise the refund into the queue. Outside the transaction on
  // purpose: the cancellation is already true and must stay true even if
  // raising the refund fails — staff can raise it by hand from the order.
  // The refund path enforces its own ceiling and its own approval.
  if (outcome.refundRaised) {
    const { available } = await refundableAmount(outcome.request.order.id);
    if (available > 0) {
      const refund = await requestRefund(actor, {
        orderId: outcome.request.order.id,
        amount: available,
        reason: `Order cancelled at customer request (${requestNumber})`,
      });
      await db.cancellationRequest.update({
        where: { id: outcome.request.id },
        data: { refundId: refund.id },
      });
    }
  }

  return { requestNumber, status: decision.status };
}
