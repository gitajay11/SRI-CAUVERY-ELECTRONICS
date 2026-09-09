import { NextResponse } from 'next/server';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { couponSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';
import { getCartView, setCouponCookie } from '@/services/cart';
import { evaluateCoupon } from '@tamizh/core/pricing';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * POST /api/cart/coupon — validate and apply a coupon.
 *
 * Only the code is stored (in a cookie); the discount is recomputed from the
 * database whenever the cart is priced, so a tampered cookie buys nothing.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'coupon'), LIMITS.coupon);
    const body = couponSchema.parse(await readJson(request));

    const cart = await getCartView();
    if (cart.items.length === 0) {
      throw new AppError('Add something to your cart first.', 409, 'empty_cart');
    }

    const coupon = await getRepository().findCoupon(body.code);
    const result = evaluateCoupon(coupon, cart.totals.subtotal);
    if (!result.valid) {
      throw new AppError(result.reason, 422, 'invalid_coupon', {
        code: result.reason,
      });
    }

    await setCouponCookie(result.coupon.code);
    return ok(await getCartView(), noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/cart/coupon — remove the applied coupon. */
export async function DELETE(): Promise<NextResponse> {
  try {
    await setCouponCookie(null);
    return ok(await getCartView(), noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
