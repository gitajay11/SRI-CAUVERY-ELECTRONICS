import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddressInput,
  AddressView,
  OrderView,
  ProductCardView,
  SessionUser,
} from '@tamizh/core/types';
import { api } from './api';
import { useAuth } from './auth';

/**
 * Everything personal: orders, addresses, profile, the wishlist. Every key
 * starts with 'account', so signing out drops the lot in one call.
 */

export interface ReturnEligibility {
  windowDays: number;
  pending: boolean;
  returnable: {
    id: string;
    name: string;
    nameTa: string | null;
    quantity: number;
    unitPrice: number;
  }[];
}

// ---- orders -----------------------------------------------------------------

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['account', 'orders'],
    queryFn: ({ signal }) => api.get<{ orders: OrderView[] }>('/api/orders', signal),
    select: (data) => data.orders,
    enabled: Boolean(user),
    staleTime: 0,
  });
}

export function useOrder(orderNumber: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['account', 'order', orderNumber],
    queryFn: ({ signal }) =>
      api.get<{ order: OrderView; returns: ReturnEligibility | null }>(
        `/api/orders/${encodeURIComponent(orderNumber)}`,
        signal,
      ),
    enabled: Boolean(user),
    staleTime: 0,
  });
}

/** After a request on an order, both the order and the list read it back. */
function useOrderWrite<Input, Result>(
  orderNumber: string,
  write: (input: Input) => Promise<Result>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['account', 'order', orderNumber] }),
        queryClient.invalidateQueries({ queryKey: ['account', 'orders'] }),
      ]),
  });
}

export function useRequestCancellation(orderNumber: string) {
  return useOrderWrite(orderNumber, (reason: string) =>
    api.post<{ requestNumber: string }>(`/api/orders/${encodeURIComponent(orderNumber)}/cancel`, {
      reason,
    }),
  );
}

export function useRequestReturn(orderNumber: string) {
  return useOrderWrite(
    orderNumber,
    (input: {
      reason: string;
      comment?: string;
      items: { orderItemId: string; quantity: number }[];
    }) =>
      api.post<{ returnNumber: string }>(
        `/api/orders/${encodeURIComponent(orderNumber)}/return`,
        input,
      ),
  );
}

// ---- addresses ----------------------------------------------------------------

const ADDRESSES = ['account', 'addresses'] as const;

export function useAddressBook() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ADDRESSES,
    queryFn: ({ signal }) =>
      api.get<{ addresses: AddressView[] }>('/api/account/addresses', signal),
    select: (data) => data.addresses,
    enabled: Boolean(user),
  });
}

function useAddressWrite<Input>(write: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES }),
  });
}

export function useAddAddress() {
  return useAddressWrite((input: AddressInput & { isDefault: boolean }) =>
    api.post<AddressView>('/api/account/addresses', { ...input, label: 'HOME' }),
  );
}

export function useDeleteAddress() {
  return useAddressWrite((id: string) => api.delete(`/api/account/addresses/${id}`));
}

export function useSetDefaultAddress() {
  return useAddressWrite((id: string) => api.patch(`/api/account/addresses/${id}`));
}

// ---- profile and password ------------------------------------------------------

/** The session carries the display name, so a profile edit comes back with a new token. */
export function useUpdateProfile() {
  const { setSignedIn } = useAuth();
  return useMutation({
    mutationFn: (input: { name: string; phone: string }) =>
      api.patch<{ user: SessionUser; token?: string }>('/api/account/profile', input),
    onSuccess: (response) => setSignedIn(response),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post('/api/account/password', input),
  });
}

/** Deletes the account (the server asks for the password again), then signs out here. */
export function useDeleteAccount() {
  const { signOut } = useAuth();
  return useMutation({
    mutationFn: (password: string) => api.delete('/api/account', { password }),
    onSuccess: () => signOut(),
  });
}

// ---- wishlist -------------------------------------------------------------------

const WISHLIST = ['account', 'wishlist'] as const;

export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: WISHLIST,
    queryFn: ({ signal }) => api.get<{ products: ProductCardView[] }>('/api/wishlist', signal),
    select: (data) => data.products,
    enabled: Boolean(user),
  });
}

/** Whether a product is saved; false for a guest, who has no wishlist. */
export function useIsWishlisted(productId: string): boolean {
  const wishlist = useWishlist();
  return wishlist.data?.some((product) => product.id === productId) ?? false;
}

/**
 * Saves or unsaves a product. The heart changes at once; the list is read
 * back from the server afterwards, so it ends up exactly as the server has it.
 */
export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (product: ProductCardView) =>
      api.post<{ inWishlist: boolean }>('/api/wishlist', { productId: product.id }),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST });
      const before = queryClient.getQueryData<{ products: ProductCardView[] }>(WISHLIST);
      if (before) {
        const saved = before.products.some((item) => item.id === product.id);
        queryClient.setQueryData(WISHLIST, {
          products: saved
            ? before.products.filter((item) => item.id !== product.id)
            : [product, ...before.products],
        });
      }
      return { before };
    },
    onError: (_error, _product, context) => {
      if (context?.before) queryClient.setQueryData(WISHLIST, context.before);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WISHLIST }),
  });
}
