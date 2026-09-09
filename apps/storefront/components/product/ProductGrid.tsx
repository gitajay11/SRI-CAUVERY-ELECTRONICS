import Link from 'next/link';
import type { ProductCardView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { ProductCard } from './ProductCard';

/** Responsive product grid: two-up on phones, three on tablets, four on desktop. */
export function ProductGrid({
  products,
  /** Number of leading cards to mark as priority for LCP. */
  priorityCount = 0,
  className,
}: {
  products: ProductCardView[];
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4',
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}

/**
 * Horizontally scrolling product rail used on the home page.
 *
 * A native scroll-snap rail rather than a JS carousel: it is swipeable on
 * touch, scrollable with a trackpad, keyboard reachable, and ships no
 * JavaScript at all.
 */
export function ProductRail({
  products,
  seeAllHref,
  seeAllLabel,
  priorityCount = 0,
}: {
  products: ProductCardView[];
  seeAllHref?: string;
  seeAllLabel?: string;
  priorityCount?: number;
}) {
  if (products.length === 0) return null;

  return (
    <div className="-mx-4 sm:-mx-6 lg:mx-0">
      <ul className="snap-rail px-4 pb-2 sm:px-6 lg:px-0">
        {products.map((product, index) => (
          <li key={product.id} className="w-[46vw] max-w-56 sm:w-56 lg:w-auto lg:max-w-none">
            <ProductCard
              product={product}
              priority={index < priorityCount}
              className="h-full lg:w-56"
            />
          </li>
        ))}
        {seeAllHref ? (
          <li className="flex w-40 items-stretch">
            <Link
              href={seeAllHref}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-brand-200 bg-brand-50/60 px-4 text-center text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface text-lg shadow-sm">
                →
              </span>
              {seeAllLabel}
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
