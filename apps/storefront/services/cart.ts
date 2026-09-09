import 'server-only';
import { cookies } from 'next/headers';
import type { AppliedCoupon, CartView } from '@tamizh/core/types';
import { getOrCreateAnonymousId, getSessionUser, peekAnonymousId } from '@/lib/auth';
import { getRepository, type CartOwner } from './repository';
import { calculateTotals, evaluateCoupon } from '@tamizh/core/pricing';
import { getShippingRules } from './settings';

/**
 * Cart orchestration: resolves whose cart to use, prices it server-side and
 * keeps the applied coupon in a cookie.
 *
 * The coupon cookie only stores the *code*. The discount is recalculated from
 * the database on every read, so an edited cookie cannot buy anything cheaper.
 */

export const COUPON_COOKIE = 'te_coupon';

/**
 * Cart owner for read paths. Returns null when there is neither a session nor
 * a guest cookie — i.e. the visitor cannot possibly have a cart yet, so we
 * avoid setting a cookie just because someone loaded the home page.
 */
export async function resolveCartOwner(): Promise<CartOwner | null> {
  const user = await getSessionUser();
  if (user) return { userId: user.id };
  const anonymousId = await peekAnonymousId();
  return anonymousId ? { anonymousId } : null;
}

/** Cart owner for write paths, creating the guest cookie on first use. */
export async function resolveOrCreateCartOwner(): Promise<CartOwner> {
  const user = await getSessionUser();
  if (user) return { userId: user.id };
  return { anonymousId: await getOrCreateAnonymousId() };
}

async function readCouponCode(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COUPON_COOKIE)?.value?.toUpperCase();
  return value && /^[A-Z0-9_-]{3,32}$/.test(value) ? value : null;
}

export async function setCouponCookie(code: string | null): Promise<void> {
  const store = await cookies();
  if (code) {
    store.set(COUPON_COOKIE, code, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } else {
    store.set(COUPON_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  }
}

/**
 * The complete, priced cart.
 *
 * Every number here is derived from the catalogue in this request: unit
 * prices, stock clamping, coupon discount, delivery and total.
 */
export async function getCartView(): Promise<CartView> {
  const owner = await resolveCartOwner();
  if (!owner) {
    return {
      items: [],
      totals: calculateTotals([], 0, await getShippingRules()),
      coupon: null,
      itemCount: 0,
      notices: [],
    };
  }

  const repo = getRepository();
  const { items, notices } = await repo.getCart(owner);

  let applied: AppliedCoupon | null = null;
  let discount = 0;
  const code = await readCouponCode();
  if (code && items.length > 0) {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const coupon = await repo.findCoupon(code);
    const result = evaluateCoupon(coupon, subtotal);
    if (result.valid) {
      discount = result.discount;
      applied = {
        code: result.coupon.code,
        description: result.coupon.description,
        discount: result.discount,
      };
    } else {
      // The code no longer applies (cart shrank, coupon expired). Say so once
      // rather than silently charging more than the shopper expected.
      notices.push(`Coupon ${code} was removed: ${result.reason}`);
    }
  }

  return {
    items,
    totals: calculateTotals(items, discount, await getShippingRules()),
    coupon: applied,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    notices,
  };
}

/** Lightweight badge count for the header, without pricing the whole cart. */
export async function getCartCount(): Promise<number> {
  const owner = await resolveCartOwner();
  if (!owner) return 0;
  const { items } = await getRepository().getCart(owner);
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * The cart's badge count and what is in it, in one read.
 *
 * Counting the cart already loads every line, so returning them alongside the
 * total costs nothing — and it is what lets an "Add to cart" button on a
 * freshly loaded page already know it is holding three of something, rather
 * than finding out only after the shopper presses it again.
 */
export async function getCartSummary(): Promise<{
  count: number;
  lines: { productId: string; variantId: string | null; itemId: string; quantity: number }[];
}> {
  const owner = await resolveCartOwner();
  if (!owner) return { count: 0, lines: [] };
  const { items } = await getRepository().getCart(owner);
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    lines: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      itemId: item.id,
      quantity: item.quantity,
    })),
  };
}
