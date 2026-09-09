import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { checkoutSchema } from '@/lib/validation';
import { placeOrder } from '@/services/checkout';

/**
 * POST /api/checkout — place an order.
 *
 * The request carries contact details, a delivery address and a payment
 * method. Line items, prices, coupon discount, delivery and the total are all
 * recomputed from the server-side cart, so this endpoint cannot be used to buy
 * anything at a price the shopper chose.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'checkout'), LIMITS.checkout);
    const body = checkoutSchema.parse(await readJson(request));
    const result = await placeOrder(body);

    return created({
      order: result.order,
      payment: result.paymentClientConfig,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
