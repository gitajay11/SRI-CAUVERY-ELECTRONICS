import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { cancelOrderSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';
import { notifyAdmin } from '@/services/notifications';

/**
 * POST /api/orders/[orderNumber]/cancel — ask for an order to be cancelled.
 *
 * Only the order's owner may ask, and only while the order is still in a
 * cancellable state. Nothing is cancelled here: a request is filed for staff
 * to approve or reject, and the order does not change until they do. Stock
 * and money move only on approval, through the panel's own cancellation path.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { orderNumber } = await params;
    const body = cancelOrderSchema.parse(await readJson(request));

    const result = await getRepository().requestCancellation(user.id, orderNumber, body.reason);

    // Staff should hear about this now, not when they next open the list.
    // Fire-and-forget: a notification failure must never fail the request.
    void notifyAdmin({
      type: 'CANCELLATION_REQUESTED',
      title: 'Cancellation requested',
      body: `${result.orderNumber} — ${body.reason.slice(0, 100)}`,
      url: '/cancellations',
      entityId: result.requestNumber,
    });

    return ok(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
