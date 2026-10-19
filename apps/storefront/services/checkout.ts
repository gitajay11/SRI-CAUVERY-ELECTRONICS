import 'server-only';
import { createHash } from 'node:crypto';
import type { CartItemView, CartTotals, OrderView } from '@tamizh/core/types';
import type { CheckoutInput } from '@/lib/validation';
import { AppError } from '@tamizh/core/api';
import { formatINR } from '@tamizh/core/money';
import { getSessionUser } from '@/lib/auth';
import { forgetCatalog, getRepository, type CartOwner } from './repository';
import { lineKey, type OrderReview, type ReviewLine, type SeenLine } from '@/lib/order-review';
import { deliveryForPincode, type DeliveryInfo } from './delivery';
import { calculateTotals, evaluateCoupon, generateOrderNumber } from '@tamizh/core/pricing';
import { isValidQuantity, quantityRuleFor } from '@tamizh/core/quantity';
import { resolveCartOwner, setCouponCookie } from './cart';
import { getShopSettings } from './settings';
import { after } from 'next/server';
import { notifyAdmin, sendOrderEmails } from './notifications';

/**
 * Order placement.
 *
 * The browser sends contact and address details and picks a payment method —
 * nothing else. Line items, prices, discounts, delivery and the total are all
 * recomputed here from the cart and the catalogue, so the amount charged
 * cannot be influenced by anything the client sends.
 */

export interface PlaceOrderResult {
  order: OrderView;
}

interface CheckoutQuote {
  userId: string;
  owner: CartOwner;
  items: CartItemView[];
  coupon: {
    id: string;
    code: string;
    discount: number;
    waivesShipping: boolean;
  } | null;
  totals: CartTotals;
  delivery: DeliveryInfo | null;
}

/**
 * Everything the order would be, worked out from the server's own records:
 * the cart as it is now, today's prices, the coupon, delivery and the total.
 *
 * Both the review and the order itself start here, so the shopper confirms
 * exactly what placing would create. Anything that would stop the order —
 * an empty cart, missing stock, a minimum not met, no cash on delivery to
 * that pincode — is refused here with a reason worth showing.
 */
async function quoteCheckout(input: CheckoutInput): Promise<CheckoutQuote> {
  const repo = getRepository();
  const owner = await resolveCartOwner();
  if (!owner) {
    throw new AppError('Your cart is empty.', 409, 'empty_cart');
  }

  // Orders belong to an account. The checkout page redirects a signed-out
  // shopper to sign in, but that is a convenience — this is the check that
  // decides, because the page can be bypassed and this endpoint cannot.
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AppError(
      'Please sign in to place your order.',
      401,
      'sign_in_required',
    );
  }

  // A session cookie is signed, not looked up, so it keeps working after shop
  // staff block an account. Placing an order is the point where that has to be
  // checked against the database rather than trusted from the cookie.
  const account = await repo.findUserById(sessionUser.id);
  if (!account || !account.isActive) {
    throw new AppError(
      'This account cannot place orders. Please contact the shop.',
      403,
      'account_blocked',
    );
  }

  // Reading the cart also brings it in line with stock: a line that ran out
  // is dropped and one that ran short is cut, which the review then flags.
  const { items } = await repo.getCart(owner);
  if (items.length === 0) {
    throw new AppError('Your cart is empty.', 409, 'empty_cart');
  }

  // Stock is re-checked again inside the repository transaction; this early
  // check exists to give a precise, friendly message before we create anything.
  for (const item of items) {
    const rule = quantityRuleFor(item);
    if (rule.bulk && !isValidQuantity(item.quantity, rule)) {
      throw new AppError(
        `${item.name} is sold from ${rule.min} in multiples of ${rule.step}. Please adjust the quantity in your cart.`,
        409,
        'invalid_quantity',
      );
    }
    if (item.quantity > item.availableStock) {
      throw new AppError(
        `${item.name} now has only ${item.availableStock} in stock. Please review your cart.`,
        409,
        'insufficient_stock',
      );
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  let coupon: CheckoutQuote['coupon'] = null;
  if (input.couponCode) {
    const record = await repo.findCoupon(input.couponCode);
    const result = evaluateCoupon(record, subtotal);
    if (!result.valid) {
      throw new AppError(result.reason, 409, 'invalid_coupon', {
        couponCode: result.reason,
      });
    }
    coupon = {
      id: result.coupon.id,
      code: result.coupon.code,
      discount: result.discount,
      waivesShipping: result.waivesShipping,
    };
  }

  const settings = await getShopSettings();
  const totals = calculateTotals(items, coupon?.discount ?? 0, settings, {
    waiveShipping: coupon?.waivesShipping ?? false,
  });

  // The shop's own minimum, set in the admin panel rather than compiled in.
  if (settings.minimumOrderValue > 0 && totals.subtotal < settings.minimumOrderValue) {
    throw new AppError(
      `Orders start at ${formatINR(settings.minimumOrderValue)}. Please add a little more to your cart.`,
      409,
      'below_minimum_order',
    );
  }

  // The shop takes no payment online. The checkout shows the option as
  // "coming soon" and never sends it, but the endpoint can be called directly.
  if (input.paymentMethod === 'ONLINE') {
    throw new AppError(
      'Online payment is not available yet. Please choose cash on delivery.',
      409,
      'online_payment_unavailable',
      { paymentMethod: 'Choose cash on delivery to continue.' },
    );
  }

  // Cash on delivery is per pincode, as the admin's delivery zones say.
  const delivery = await deliveryForPincode(input.pincode);
  if (delivery && !delivery.codAvailable) {
    throw new AppError(
      `Cash on delivery is not available for PIN code ${input.pincode} yet. Please call the shop to arrange your order.`,
      409,
      'cod_unavailable',
      { pincode: 'Cash on delivery is not available for this PIN code.' },
    );
  }

  return { userId: sessionUser.id, owner, items, coupon, totals, delivery };
}

/** Identifies the order a quote would place: every line, price and total. */
function fingerprintOf(quote: CheckoutQuote): string {
  const lines = quote.items
    .map((item) => `${lineKey(item)}:${item.quantity}:${item.unitPrice}`)
    .sort();
  const { subtotal, couponDiscount, shippingFee, total } = quote.totals;
  return createHash('sha256')
    .update(
      [...lines, `coupon:${quote.coupon?.code ?? ''}`, subtotal, couponDiscount, shippingFee, total].join('|'),
    )
    .digest('hex');
}

/**
 * The order review: what confirming would place, and what has changed
 * since the shopper last looked.
 */
export async function reviewOrder(input: CheckoutInput, seen: SeenLine[]): Promise<OrderReview> {
  const quote = await quoteCheckout(input);
  const seenByKey = new Map(seen.map((line) => [lineKey(line), line]));
  const currentKeys = new Set(quote.items.map((item) => lineKey(item)));

  const lines: ReviewLine[] = quote.items.map((item) => {
    const before = seenByKey.get(lineKey(item));
    const changes: ReviewLine['changes'] = [];
    if (before && before.unitPrice !== item.unitPrice) {
      changes.push({ type: 'price', previousUnitPrice: before.unitPrice });
    }
    if (before && before.quantity !== item.quantity) {
      changes.push({ type: 'quantity', previousQuantity: before.quantity });
    }
    return {
      productId: item.productId,
      variantId: item.variantId,
      slug: item.slug,
      name: item.name,
      nameTa: item.nameTa,
      variantName: item.variantName,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      changes,
    };
  });
  const removed = seen
    .filter((line) => !currentKeys.has(lineKey(line)))
    .map(({ productId, variantId }) => ({ productId, variantId }));

  return {
    lines,
    removed,
    totals: quote.totals,
    coupon: quote.coupon ? { code: quote.coupon.code, discount: quote.coupon.discount } : null,
    address: {
      name: input.customerName,
      phone: input.customerPhone,
      line1: input.addressLine1,
      line2: input.addressLine2 || null,
      city: input.city,
      district: input.district,
      state: input.state,
      pincode: input.pincode,
    },
    delivery: quote.delivery
      ? { earliest: quote.delivery.earliest, latest: quote.delivery.latest }
      : null,
    changed: removed.length > 0 || lines.some((line) => line.changes.length > 0),
    fingerprint: fingerprintOf(quote),
  };
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const repo = getRepository();

  // A retry of a confirm that already went through — the response was lost,
  // or the button was pressed twice. The cart is empty by now, so quoting
  // would fail; the answer is the order that press already placed.
  if (input.idempotencyKey) {
    const user = await getSessionUser();
    const earlier = user ? await repo.findOrderByIdempotencyKey(user.id, input.idempotencyKey) : null;
    if (earlier) return { order: earlier };
  }

  const quote = await quoteCheckout(input);
  const { owner, items, coupon, totals } = quote;

  // The shopper confirmed one particular order. If prices, stock or the
  // total have moved since, this is not it — ask them to look again rather
  // than charging something they did not see.
  if (input.expectedFingerprint && input.expectedFingerprint !== fingerprintOf(quote)) {
    throw new AppError(
      'Your order changed while you were reviewing it. Please check the updated details.',
      409,
      'review_changed',
    );
  }

  const orderNumber = generateOrderNumber();

  const { order, replayed } = await repo.placeOrder({
    userId: quote.userId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 || undefined,
    city: input.city,
    district: input.district,
    state: input.state,
    pincode: input.pincode,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'COD_PENDING',
    notes: input.notes || undefined,
    coupon,
    items,
    subtotal: totals.subtotal,
    discountTotal: totals.couponDiscount,
    shippingFee: totals.shippingFee,
    total: totals.total,
    orderNumber,
    paymentProvider: 'cod',
    paymentProviderOrderId: null,
    idempotencyKey: input.idempotencyKey ?? null,
  });

  // A second request for the same press, which waited for the first and
  // found its order: everything below has already happened once.
  if (replayed) return { order };

  // The order exists; the cart and the coupon have served their purpose.
  await repo.clearCart(owner);
  // Stock moved, so every cached listing and product page is stale.
  forgetCatalog();
  await setCouponCookie(null);

  if (input.saveAddress) {
    // Best effort — a failure to save the address book entry must never lose
    // an order that has already been placed.
    try {
      await repo.createAddress(quote.userId, {
        fullName: input.customerName,
        phone: input.customerPhone,
        line1: input.addressLine1,
        line2: input.addressLine2 || undefined,
        city: input.city,
        district: input.district,
        state: input.state,
        pincode: input.pincode,
      });
    } catch (error) {
      console.error('[checkout] could not save address', error);
    }
  }

  // The emails — the customer's confirmation and the shop's copy — go out
  // once the order is a fact, which for cash on delivery is now.
  //
  // `after` runs this once the response has gone, so a slow mail server never
  // keeps a shopper looking at a spinner — and, unlike a dropped promise, the
  // platform keeps the function alive until it finishes.
  after(() => sendOrderEmails(order));

  // Staff alert. Not awaited into the response: the order is committed, and a
  // slow notification host must not keep a shopper waiting on their receipt.
  void notifyAdmin({
    type: 'NEW_ORDER',
    title: 'New order received',
    // No customer name — these land on lock screens.
    body: `${order.orderNumber} · ${formatINR(order.total)}`,
    entityId: order.orderNumber,
    url: `/orders/${order.orderNumber}`,
  });

  return { order };
}
