import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { removeCoupon, updateCoupon } from '@/services/coupons';
import { couponInputSchema } from '@/lib/schemas';
import { toCouponInput } from '@/lib/coupon-input';

/** PUT /api/admin/coupons/[id] — replace a coupon's terms. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('coupons.manage');
    const { id } = await params;
    const body = couponInputSchema.parse(await readJson(request));
    await updateCoupon(identity, id, toCouponInput(body));
    return ok({ updated: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/coupons/[id] — deletes if unused, else switches off. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('coupons.manage');
    const { id } = await params;
    const result = await removeCoupon(identity, id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
