import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { orderReviewSchema } from '@/lib/validation';
import { reviewOrder } from '@/services/checkout';

/**
 * POST /api/checkout/review — what "Confirm order" would place.
 *
 * Takes the same details as /api/checkout plus the cart lines as the shopper
 * last saw them, and answers with the order worked out afresh on the server:
 * lines, today's prices, totals, the address, the delivery window, and which
 * lines changed. Nothing is created and nothing is reserved.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'checkout-review'), LIMITS.coupon);
    const { seen, ...input } = orderReviewSchema.parse(await readJson(request));
    const review = await reviewOrder(input, seen);
    return ok(review, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
