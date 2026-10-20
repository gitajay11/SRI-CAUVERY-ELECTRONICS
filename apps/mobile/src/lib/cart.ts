import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartView } from '@tamizh/core/types';
import { api } from './api';
import { session } from './session';

/**
 * The cart as the server prices it. Every write answers with the whole priced
 * cart, which goes straight into the cache, so the tab badge and the cart
 * screen never show a figure the server did not produce.
 */

export const CART_KEY = ['cart'] as const;

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: ({ signal }) => api.get<CartView>('/api/cart', signal),
    // Personal and changed from other devices; always worth a fresh look.
    staleTime: 0,
  });
}

/** Writes that answer with the priced cart, which replaces the cached one. */
function useCartWrite<Input>(write: (input: Input) => Promise<CartView>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}

export function useAddToCart() {
  return useCartWrite((input: { productId: string; quantity: number }) =>
    api.post<CartView>('/api/cart/items', input),
  );
}

/** A new quantity for a line; zero removes it. */
export function useUpdateCartItem() {
  return useCartWrite((input: { itemId: string; quantity: number }) =>
    api.patch<CartView>('/api/cart/items', input),
  );
}

/**
 * Applies a coupon. The server checks it against the cart; once it agrees,
 * the code is kept so every later request carries it (X-Coupon-Code).
 */
export function useApplyCoupon() {
  return useCartWrite(async (code: string) => {
    const cart = await api.post<CartView>('/api/cart/coupon', { code });
    await session.setCoupon(cart.coupon?.code ?? null);
    return cart;
  });
}

export function useRemoveCoupon() {
  return useCartWrite(async () => {
    await session.setCoupon(null);
    return api.delete<CartView>('/api/cart/coupon');
  });
}
