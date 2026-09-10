import 'server-only';
import type { OrderView } from '@tamizh/core/types';
import type { CheckoutInput } from '@/lib/validation';
import { AppError } from '@tamizh/core/api';
import { formatINR } from '@tamizh/core/money';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from './repository';
import { calculateTotals, evaluateCoupon, generateOrderNumber } from '@tamizh/core/pricing';
import { onlinePaymentAvailable, providerFor } from './payments';
import { resolveCartOwner, setCouponCookie } from './cart';
import { getShopSettings } from './settings';
import { notifyAdmin, sendOrderConfirmation } from './notifications';

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
  /** Non-null when the browser must complete a gateway step. */
  paymentClientConfig: Record<string, string | number> | null;
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
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

  const { items } = await repo.getCart(owner);
  if (items.length === 0) {
    throw new AppError('Your cart is empty.', 409, 'empty_cart');
  }

  // Stock is re-checked again inside the repository transaction; this early
  // check exists to give a precise, friendly message before we create anything.
  for (const item of items) {
    if (item.quantity > item.availableStock) {
      throw new AppError(
        `${item.name} now has only ${item.availableStock} in stock. Please review your cart.`,
        409,
        'insufficient_stock',
      );
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  let coupon: {
    id: string;
    code: string;
    discount: number;
    waivesShipping: boolean;
  } | null = null;
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

  if (input.paymentMethod === 'ONLINE' && !onlinePaymentAvailable()) {
    throw new AppError(
      'Online payment is not available right now. Please choose cash on delivery.',
      409,
      'online_payment_unavailable',
      { paymentMethod: 'Choose cash on delivery to continue.' },
    );
  }

  const orderNumber = generateOrderNumber();
  const provider = providerFor(input.paymentMethod);
  const intent = await provider.createIntent({
    amount: totals.total,
    orderNumber,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
  });

  const order = await repo.placeOrder({
    userId: sessionUser.id,
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
    paymentStatus: intent.status,
    notes: input.notes || undefined,
    coupon,
    items,
    subtotal: totals.subtotal,
    discountTotal: totals.couponDiscount,
    shippingFee: totals.shippingFee,
    total: totals.total,
    orderNumber,
    paymentProvider: intent.provider,
    paymentProviderOrderId: intent.providerOrderId,
  });

  // The order exists; the cart and the coupon have served their purpose.
  await repo.clearCart(owner);
  await setCouponCookie(null);

  if (input.saveAddress) {
    // Best effort — a failure to save the address book entry must never lose
    // an order that has already been placed.
    try {
      await repo.createAddress(sessionUser.id, {
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

  await sendOrderConfirmation(order);

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

  return {
    order,
    paymentClientConfig: intent.completed ? null : intent.clientConfig,
  };
}
