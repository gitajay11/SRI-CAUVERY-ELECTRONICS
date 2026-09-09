import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { cancelOrderSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';

/**
 * POST /api/orders/[orderNumber]/cancel
 *
 * Only the order's owner may cancel it, and only while it is still in a
 * cancellable state. Stock is returned to the catalogue by the repository as
 * part of the same transaction.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { orderNumber } = await params;
    const body = cancelOrderSchema.parse(await readJson(request));

    const order = await getRepository().cancelOrder(user.id, orderNumber, body.reason);
    return ok({ order }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
