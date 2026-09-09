import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { returnRequestSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';
import { notifyAdmin } from '@/services/notifications';

/**
 * POST /api/orders/[orderNumber]/return
 *
 * Raises a return request. Ownership, the delivery status, the return window
 * and the quantities are all checked server-side against stored data; nothing
 * about eligibility is taken from the browser.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { orderNumber } = await params;
    const body = returnRequestSchema.parse(await readJson(request));

    const result = await getRepository().requestReturn(
      user.id,
      decodeURIComponent(orderNumber),
      body,
    );

    // Staff alert, best effort — the request is already recorded and visible
    // in the panel's returns list whether or not this reaches anyone.
    void notifyAdmin({
      type: 'RETURN_REQUESTED',
      title: 'Return requested',
      body: `${result.orderNumber} — ${result.lines} item(s)`,
      entityId: result.returnNumber,
      url: `/returns/${result.returnNumber}`,
    });

    return created({ returnNumber: result.returnNumber });
  } catch (error) {
    return handleRouteError(error);
  }
}
