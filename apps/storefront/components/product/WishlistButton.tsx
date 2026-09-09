'use client';

import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { HeartIcon } from '@/components/ui/Icons';

/**
 * Wishlist heart.
 *
 * Optimistic through CartProvider, so it fills instantly and reverts if the
 * request fails. Guests get a prompt to sign in rather than a silent no-op.
 */
export function WishlistButton({
  productId,
  size = 'md',
  withLabel = false,
  className,
}: {
  productId: string;
  size?: 'sm' | 'md' | 'lg';
  withLabel?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const { wishlistIds, toggleWishlist } = useCart();
  const [pulse, setPulse] = useState(false);
  const saved = wishlistIds.has(productId);

  const dimensions =
    size === 'lg' ? 'size-12 text-2xl' : size === 'sm' ? 'size-8 text-base' : 'size-9 text-lg';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setPulse(true);
        setTimeout(() => setPulse(false), 320);
        void toggleWishlist(productId);
      }}
      aria-pressed={saved}
      aria-label={saved ? t('product.removeFromWishlist') : t('product.addToWishlist')}
      title={saved ? t('product.removeFromWishlist') : t('product.addToWishlist')}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border transition-all duration-200',
        'motion-safe:active:scale-90',
        withLabel ? 'min-h-11 px-4 text-sm font-semibold' : dimensions,
        saved
          ? 'border-danger-500/25 bg-danger-50 text-danger-500'
          : 'border-ink-200 bg-surface/90 text-ink-500 backdrop-blur hover:border-danger-500/30 hover:text-danger-500',
        pulse && 'motion-safe:scale-110',
        className,
      )}
    >
      <HeartIcon filled={saved} />
      {withLabel ? (
        <span>{saved ? t('product.removeFromWishlist') : t('product.addToWishlist')}</span>
      ) : null}
    </button>
  );
}
