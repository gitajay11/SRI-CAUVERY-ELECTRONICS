import type { CartItemView, CartTotals, OrderStatus } from './types.ts';

/**
 * Shop pricing rules — the single place where money is decided.
 *
 * Everything here works in paise and is only ever executed on the server, so a
 * tampered client payload cannot change what a shopper is charged.
 */

/**
 * Defaults, used until StoreSettings is read. The admin can change both, so
 * anything computing a real total should pass the configured values in rather
 * than relying on these.
 */
/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD = 49_900; // ₹499

/** Flat delivery charge below the threshold. */
export const STANDARD_SHIPPING_FEE = 4_900; // ₹49

/** The shipping numbers a calculation needs, as configured by the shop. */
export interface ShippingRules {
  freeShippingThreshold: number;
  standardShippingFee: number;
}

export const DEFAULT_SHIPPING_RULES: ShippingRules = {
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  standardShippingFee: STANDARD_SHIPPING_FEE,
};

export interface CouponRule {
  id: string;
  code: string;
  description: string;
  type: 'PERCENT' | 'FLAT' | 'FREE_SHIPPING';
  /** Basis points for PERCENT (1000 = 10%), paise for FLAT, unused for FREE_SHIPPING. */
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: Date;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export type CouponCheck =
  | {
      valid: true;
      discount: number;
      /**
       * Whether delivery is waived.
       *
       * Deliberately not folded into `discount`. The delivery fee depends on
       * the subtotal *after* the discount, so a waiver expressed as money
       * would change the very number it is derived from — and it would also
       * show up on the order as money off the goods, which it is not.
       */
      waivesShipping: boolean;
      coupon: CouponRule;
    }
  | { valid: false; reason: string };

/**
 * Validates a coupon against a subtotal.
 *
 * Returns a reason rather than throwing so the caller can decide whether an
 * invalid coupon is an error (applying it) or simply ignored (an old code
 * still sitting in a cart at checkout time).
 */
export function evaluateCoupon(
  coupon: CouponRule | null,
  subtotal: number,
  now: Date = new Date(),
): CouponCheck {
  if (!coupon || !coupon.isActive) {
    return { valid: false, reason: 'This coupon code is not valid.' };
  }
  if (coupon.startsAt > now) {
    return { valid: false, reason: 'This coupon is not active yet.' };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { valid: false, reason: 'This coupon has expired.' };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, reason: 'This coupon has reached its usage limit.' };
  }
  if (subtotal < coupon.minOrder) {
    const shortfall = coupon.minOrder - subtotal;
    return {
      valid: false,
      reason: `Add ₹${Math.ceil(shortfall / 100)} more to use this coupon.`,
    };
  }

  // A shipping waiver takes nothing off the goods; the saving appears as a
  // delivery fee of zero further down.
  if (coupon.type === 'FREE_SHIPPING') {
    return { valid: true, discount: 0, waivesShipping: true, coupon };
  }

  // PERCENT coupons store basis points (1000 = 10%), so that "12.5% off" is
  // expressible without floats.
  let discount =
    coupon.type === 'PERCENT'
      ? Math.floor((subtotal * coupon.value) / 10_000)
      : coupon.value;

  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  // Never discount below zero, and never more than the goods are worth.
  discount = Math.max(0, Math.min(discount, subtotal));

  return { valid: true, discount, waivesShipping: false, coupon };
}

export function shippingFeeFor(
  subtotalAfterDiscount: number,
  rules: ShippingRules = DEFAULT_SHIPPING_RULES,
): number {
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= rules.freeShippingThreshold
    ? 0
    : rules.standardShippingFee;
}

/**
 * Computes every number shown on the cart and checkout summary.
 * `couponDiscount` is passed in already validated by `evaluateCoupon`.
 */
export function calculateTotals(
  items: Pick<CartItemView, 'unitPrice' | 'mrp' | 'quantity'>[],
  couponDiscount = 0,
  rules: ShippingRules = DEFAULT_SHIPPING_RULES,
  options: { waiveShipping?: boolean } = {},
): CartTotals {
  let subtotal = 0;
  let mrpTotal = 0;
  for (const item of items) {
    subtotal += item.unitPrice * item.quantity;
    mrpTotal += Math.max(item.mrp, item.unitPrice) * item.quantity;
  }

  const cappedCoupon = Math.max(0, Math.min(couponDiscount, subtotal));
  const afterDiscount = subtotal - cappedCoupon;
  const shippingFee = options.waiveShipping ? 0 : shippingFeeFor(afterDiscount, rules);

  return {
    subtotal,
    mrpTotal,
    productDiscount: Math.max(0, mrpTotal - subtotal),
    couponDiscount: cappedCoupon,
    shippingFee,
    total: afterDiscount + shippingFee,
    // With delivery already waived there is nothing left to spend towards it,
    // so the "add ₹x more for free delivery" nudge must not appear.
    freeShippingRemaining:
      !options.waiveShipping &&
      afterDiscount > 0 &&
      afterDiscount < rules.freeShippingThreshold
        ? rules.freeShippingThreshold - afterDiscount
        : 0,
  };
}

/**
 * Human-readable order number, e.g. `TE-260908-4F2A`.
 * Date-prefixed so shop staff can sort a printed list by eye.
 */
export function generateOrderNumber(random: () => number = Math.random): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(random() * alphabet.length)];
  }
  return `TE-${yy}${mm}${dd}-${suffix}`;
}

/** Order statuses a customer is still allowed to cancel from. */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
];

/**
 * The fulfilment state machine.
 *
 * Enforced server-side on every status change so an order cannot jump from
 * "pending" straight to "delivered" — which would skip the stock and payment
 * side effects attached to the intermediate steps.
 */
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

/** The happy path, used to draw the order timeline. */
export const FULFILMENT_STEPS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** Statuses that mean the order is finished, one way or another. */
export const TERMINAL_STATUSES: OrderStatus[] = [
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false;
}

/** Statuses in which stock is committed and must be released if cancelled. */
export function reservesStock(status: OrderStatus): boolean {
  return !TERMINAL_STATUSES.includes(status) || status === 'DELIVERED';
}
