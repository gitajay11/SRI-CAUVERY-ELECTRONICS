'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { ProductImageView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';

/**
 * Product image gallery.
 *
 * On phones it is a swipeable scroll-snap rail with dot indicators — the
 * gesture people already expect from shopping apps — and on desktop it becomes
 * a main image with a thumbnail strip. One component, no carousel library.
 */
export function ProductGallery({
  images,
  productName,
  badge,
}: {
  images: ProductImageView[];
  productName: string;
  badge?: React.ReactNode;
}) {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-card bg-ink-100 text-ink-400">
        —
      </div>
    );
  }

  const scrollTo = (index: number) => {
    setActive(index);
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({ left: rail.clientWidth * index, behavior: 'smooth' });
  };

  return (
    <div className="lg:flex lg:gap-4">
      {/* Desktop thumbnails */}
      {images.length > 1 ? (
        <div
          className="hidden shrink-0 flex-col gap-2.5 lg:flex"
          role="tablist"
          aria-label={t('product.gallery')}
        >
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={t('product.viewImage', { index: index + 1 })}
              onClick={() => setActive(index)}
              className={cn(
                'relative size-18 overflow-hidden rounded-xl border-2 transition-colors',
                index === active
                  ? 'border-brand-500'
                  : 'border-ink-100 hover:border-ink-300',
              )}
            >
              <Image
                src={image.url}
                alt=""
                width={72}
                height={72}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative min-w-0 flex-1">
        {/* Mobile: swipeable rail */}
        <div
          ref={railRef}
          className="snap-rail -mx-4 gap-0 rounded-none sm:mx-0 sm:rounded-card lg:hidden"
          onScroll={(event) => {
            const element = event.currentTarget;
            const index = Math.round(element.scrollLeft / element.clientWidth);
            if (index !== active) setActive(index);
          }}
        >
          {images.map((image, index) => (
            <div key={image.url} className="w-full">
              <div className="relative aspect-square w-full overflow-hidden bg-ink-50 sm:rounded-card">
                <Image
                  src={image.url}
                  alt={index === 0 ? image.alt || productName : ''}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: single large image */}
        <div className="relative hidden aspect-square overflow-hidden rounded-card border border-ink-100 bg-ink-50 lg:block">
          <Image
            src={images[active]?.url ?? images[0]!.url}
            alt={images[active]?.alt || productName}
            fill
            sizes="(max-width: 1280px) 45vw, 520px"
            priority
            className="object-cover"
          />
        </div>

        {badge ? <div className="absolute left-4 top-4 z-10">{badge}</div> : null}

        {/* Mobile dots */}
        {images.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={t('product.viewImage', { index: index + 1 })}
                aria-current={index === active}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === active ? 'w-6 bg-brand-600' : 'w-1.5 bg-ink-300',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
