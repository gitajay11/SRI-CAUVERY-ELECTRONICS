'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { useLocale } from '@/components/providers/LocaleProvider';
import { StarRating } from '@/components/ui/Primitives';
import { AddToCartButton } from './AddToCartButton';
import { WishlistButton } from './WishlistButton';

/**
 * Product card.
 *
 * Two-up on phones, four-up on desktop. Everything a shopper needs to decide
 * is on the face of the card — price, saving, rating and stock — with the
 * whole card clickable and the two controls (wishlist, add) layered above it
 * as real buttons rather than nested inside the link.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardView;
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}) {
  const { t, pick } = useLocale();
  const name = pick(product.name, product.nameTa);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-ink-100 bg-surface',
        'shadow-card transition-[box-shadow,transform] duration-300 hover:shadow-card-hover',
        'motion-safe:hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        <Link href={`/product/${product.slug}`} className="block size-full" tabIndex={-1}>
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt || name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              className={cn(
                'object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]',
                outOfStock && 'opacity-55 saturate-50',
              )}
            />
          ) : (
            <div className="grid size-full place-items-center text-ink-300">—</div>
          )}
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            {product.discountPercent > 0 ? (
              <span className="rounded-full bg-gold-500 px-2 py-1 text-[0.68rem] font-bold leading-none text-ink-900 shadow-sm">
                {t('product.off', { percent: product.discountPercent })}
              </span>
            ) : null}
          </div>
          <WishlistButton productId={product.id} className="pointer-events-auto" />
        </div>

        {outOfStock ? (
          <span className="absolute inset-x-0 bottom-0 bg-ink-900/85 py-1.5 text-center text-xs font-bold text-white">
            {t('product.outOfStock')}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-400">
          {product.brand}
        </p>

        <h3 className="text-sm font-semibold leading-snug text-ink-900 sm:text-[0.95rem]">
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-brand-700"
          >
            {name}
          </Link>
        </h3>

        {product.ratingCount > 0 ? (
          <StarRating value={product.ratingAvg} count={product.ratingCount} />
        ) : null}

        <div className="mt-auto pt-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-lg font-bold leading-tight text-ink-900">
              {formatINR(product.price)}
            </span>
            {product.mrp > product.price ? (
              <span className="text-sm text-ink-400 line-through">
                {formatINR(product.mrp)}
              </span>
            ) : null}
          </div>
          {lowStock ? (
            <p className="mt-1 text-xs font-semibold text-warning-500">
              {t('product.lowStock', { count: product.stock })}
            </p>
          ) : null}
        </div>

        <AddToCartButton
          productId={product.id}
          productName={name}
          disabled={outOfStock}
          size="sm"
          className="relative z-10 mt-2.5 w-full"
        />
      </div>
    </article>
  );
}
