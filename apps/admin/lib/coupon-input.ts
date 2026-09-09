import type { z } from 'zod';
import type { couponInputSchema } from './schemas';
import type { CouponInput } from '@/services/coupons';

/**
 * Folds the two discount fields into the one the database stores.
 *
 * The form asks for a percentage or an amount depending on the coupon type;
 * both arrive already converted by the schema (basis points and paise), and
 * this picks the one that matches the type so the service never has to guess
 * what `value` means.
 */
export function toCouponInput(body: z.infer<typeof couponInputSchema>): CouponInput {
  return {
    code: body.code,
    description: body.description,
    type: body.type,
    value: body.type === 'PERCENT' ? (body.percentValue ?? 0) : (body.flatValue ?? 0),
    minOrder: body.minOrder,
    maxDiscount: body.maxDiscount ?? null,
    startsAt: body.startsAt,
    endsAt: body.endsAt ?? null,
    usageLimit: body.usageLimit ?? null,
    perUserLimit: body.perUserLimit ?? null,
    isActive: body.isActive,
    categoryIds: body.categoryIds,
    productIds: body.productIds,
  };
}
