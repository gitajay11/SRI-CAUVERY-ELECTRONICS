import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { createCoupon } from '@/services/coupons';
import { couponInputSchema } from '@/lib/schemas';
import { toCouponInput } from '@/lib/coupon-input';

/** POST /api/admin/coupons — create a coupon. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('coupons.manage');
    const body = couponInputSchema.parse(await readJson(request));
    const coupon = await createCoupon(identity, toCouponInput(body));
    return created({ id: coupon.id, code: coupon.code });
  } catch (error) {
    return handleRouteError(error);
  }
}
