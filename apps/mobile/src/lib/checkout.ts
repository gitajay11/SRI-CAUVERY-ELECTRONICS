import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddressView, CartView, OrderView } from '@tamizh/core/types';
import type { OrderReview, SeenLine } from '@shop/order-review';
import { api } from './api';
import { CART_KEY } from './cart';
import { session } from './session';

/**
 * Checkout, as the website does it: the shopper's details go to the review
 * endpoint, which prices the order afresh and says what changed; "Confirm"
 * then places exactly that order — the fingerprint makes the server refuse
 * if anything moved in between, and the idempotency key makes a retried
 * press return the first order rather than place a second.
 */

export interface CheckoutDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  notes: string;
  saveAddress: boolean;
}

export function useAddresses(enabled: boolean) {
  return useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: ({ signal }) =>
      api.get<{ addresses: AddressView[] }>('/api/account/addresses', signal),
    select: (data) => data.addresses,
    enabled,
  });
}

function body(details: CheckoutDetails) {
  return {
    ...details,
    paymentMethod: 'COD' as const,
    couponCode: session.coupon ?? '',
  };
}

export function useReviewOrder() {
  return useMutation({
    mutationFn: (input: { details: CheckoutDetails; seen: SeenLine[] }) =>
      api.post<OrderReview>('/api/checkout/review', { ...body(input.details), seen: input.seen }),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { details: CheckoutDetails; fingerprint: string; idempotencyKey: string }) =>
      api.post<{ order: OrderView }>('/api/checkout', {
        ...body(input.details),
        expectedFingerprint: input.fingerprint,
        idempotencyKey: input.idempotencyKey,
      }),
    onSuccess: async ({ order }) => {
      // The order took the cart and the coupon with it.
      await session.setCoupon(null);
      queryClient.setQueryData(['order', order.orderNumber], order);
      queryClient.setQueryData<CartView | undefined>(CART_KEY, (cart) =>
        cart ? { ...cart, items: [], itemCount: 0, coupon: null, notices: [] } : cart,
      );
      void queryClient.invalidateQueries({ queryKey: CART_KEY });
      void queryClient.invalidateQueries({ queryKey: ['account'] });
      // Stock moved: product pages and listings are worth a fresh look.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['product'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/** The cart lines as the shopper sees them now, for the review to compare against. */
export function seenLines(cart: CartView): SeenLine[] {
  return cart.items.map(({ productId, variantId, quantity, unitPrice }) => ({
    productId,
    variantId,
    quantity,
    unitPrice,
  }));
}
