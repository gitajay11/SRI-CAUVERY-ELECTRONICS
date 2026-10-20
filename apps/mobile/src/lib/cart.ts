import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartView } from '@tamizh/core/types';
import { api } from './api';

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

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; quantity: number }) =>
      api.post<CartView>('/api/cart/items', input),
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}
