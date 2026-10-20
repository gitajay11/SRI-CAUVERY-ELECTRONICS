import { NextResponse } from 'next/server';
import { handleRouteError, notFound, ok } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';

/**
 * GET /api/orders/:orderNumber — one of the signed-in shopper's orders, with
 * what it would take to return part of it: the window, whether a return is
 * already pending, and which lines (and how many of each) can still go back.
 * `returns` is null when the order cannot be returned at all.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const orderNumber = decodeURIComponent((await params).orderNumber);
    const repo = getRepository();

    const order = await repo.getOrderForUser(user.id, orderNumber);
    if (!order) throw notFound('Order not found.');

    const returns = await repo.returnEligibility(user.id, orderNumber);

    return ok({ order, returns }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
