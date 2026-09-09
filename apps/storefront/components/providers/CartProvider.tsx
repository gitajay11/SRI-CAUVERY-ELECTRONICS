'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import type { CartView } from '@tamizh/core/types';
import { ApiError, api } from '@/lib/http';
import { useToast } from './ToastProvider';
import { useLocale } from './LocaleProvider';

/**
 * Client-side cart coordination.
 *
 * The cart itself lives on the server — this provider only holds the badge
 * count so the header updates the instant something is added, and funnels all
 * mutations through one place so every screen gets the same optimistic update,
 * toast and refresh behaviour.
 */

export interface CartLine {
  itemId: string;
  quantity: number;
}

/** Lines are keyed by product *and* variant, because the API accepts both. */
export function lineKey(productId: string, variantId: string | null = null): string {
  return `${productId}|${variantId ?? ''}`;
}

interface CartContextValue {
  count: number;
  /** True while a mutation is in flight. */
  pending: boolean;
  addItem: (productId: string, quantity?: number, productName?: string) => Promise<boolean>;
  setQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string, productName?: string) => Promise<boolean>;
  /** What is already in the cart for this product, if anything. */
  lineFor: (productId: string, variantId?: string | null) => CartLine | null;
  wishlistIds: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  initialCount,
  initialLines,
  initialWishlistIds,
  isSignedIn,
  children,
}: {
  initialCount: number;
  initialLines: { productId: string; variantId: string | null; itemId: string; quantity: number }[];
  initialWishlistIds: string[];
  isSignedIn: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();
  const [count, setCount] = useState(initialCount);
  const [lines, setLines] = useState<Record<string, CartLine>>(() =>
    Object.fromEntries(
      initialLines.map((l) => [
        lineKey(l.productId, l.variantId),
        { itemId: l.itemId, quantity: l.quantity },
      ]),
    ),
  );
  const [wishlistIds, setWishlistIds] = useState(() => new Set(initialWishlistIds));
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const refresh = useCallback(() => {
    startRefresh(() => router.refresh());
  }, [router]);

  /**
   * Every mutation returns the whole cart, so the lines are re-derived from
   * the server's answer rather than patched locally. A quantity the server
   * clamped because stock ran out is then what the button shows.
   */
  const absorb = useCallback((cart: CartView) => {
    setCount(cart.itemCount);
    setLines(
      Object.fromEntries(
        cart.items.map((item) => [
          lineKey(item.productId, item.variantId),
          { itemId: item.id, quantity: item.quantity },
        ]),
      ),
    );
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t('error.body');
      toast(message, { tone: 'error' });
    },
    [toast, t],
  );

  const addItem = useCallback<CartContextValue['addItem']>(
    async (productId, quantity = 1, productName) => {
      setBusy(true);
      try {
        const cart = await api.post<CartView>('/api/cart/items', {
          productId,
          quantity,
        });
        absorb(cart);
        toast(productName ? `${productName} — ${t('product.added')}` : t('product.added'), {
          action: { label: t('nav.cart'), href: '/cart' },
        });
        refresh();
        return true;
      } catch (error) {
        handleError(error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [absorb, handleError, refresh, t, toast],
  );

  const setQuantity = useCallback<CartContextValue['setQuantity']>(
    async (itemId, quantity) => {
      setBusy(true);
      try {
        const cart = await api.patch<CartView>('/api/cart/items', { itemId, quantity });
        absorb(cart);
        refresh();
        return true;
      } catch (error) {
        handleError(error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [absorb, handleError, refresh],
  );

  const removeItem = useCallback<CartContextValue['removeItem']>(
    async (itemId, productName) => {
      const done = await setQuantity(itemId, 0);
      if (done && productName) {
        toast(t('cart.removed', { name: productName }), { tone: 'info' });
      }
      return done;
    },
    [setQuantity, t, toast],
  );

  const toggleWishlist = useCallback<CartContextValue['toggleWishlist']>(
    async (productId) => {
      if (!isSignedIn) {
        toast(t('auth.requiresSignIn'), {
          tone: 'info',
          action: { label: t('nav.signIn'), href: '/signin?next=/wishlist' },
        });
        return;
      }
      // Optimistic: the heart must respond instantly on a slow connection.
      const previous = new Set(wishlistIds);
      const next = new Set(wishlistIds);
      const wasSaved = next.has(productId);
      if (wasSaved) next.delete(productId);
      else next.add(productId);
      setWishlistIds(next);

      try {
        const result = await api.post<{ inWishlist: boolean }>('/api/wishlist', {
          productId,
        });
        if (result.inWishlist) toast(t('product.wishlistAdded'));
        refresh();
      } catch (error) {
        setWishlistIds(previous);
        handleError(error);
      }
    },
    [handleError, isSignedIn, refresh, t, toast, wishlistIds],
  );

  const lineFor = useCallback<CartContextValue['lineFor']>(
    (productId, variantId = null) => lines[lineKey(productId, variantId)] ?? null,
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      count,
      pending: busy || isRefreshing,
      addItem,
      setQuantity,
      removeItem,
      lineFor,
      wishlistIds,
      toggleWishlist,
    }),
    [
      count,
      busy,
      isRefreshing,
      addItem,
      setQuantity,
      removeItem,
      lineFor,
      wishlistIds,
      toggleWishlist,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>.');
  return context;
}
