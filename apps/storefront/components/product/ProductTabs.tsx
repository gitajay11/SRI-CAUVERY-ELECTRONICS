'use client';

import { useState } from 'react';
import type { ProductDetailView } from '@tamizh/core/types';
import { cn, formatDate } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { StarRating } from '@/components/ui/Primitives';
import { ReviewForm } from './ReviewForm';

/**
 * Description / specifications / reviews.
 *
 * A real tab widget (roving tabindex, arrow-key navigation) rather than three
 * stacked headings, because the spec table on a phone is long enough that
 * scrolling past it to reach reviews is a genuine annoyance.
 */
export function ProductTabs({
  product,
  canReview,
  isSignedIn,
}: {
  product: ProductDetailView;
  canReview: boolean;
  isSignedIn: boolean;
}) {
  const { t, pick, locale } = useLocale();
  const [active, setActive] = useState<'description' | 'specs' | 'reviews'>('description');

  const specEntries = Object.entries(product.specs);
  const tabs = [
    { id: 'description', label: t('product.description') },
    ...(specEntries.length > 0
      ? [{ id: 'specs' as const, label: t('product.specifications') }]
      : []),
    {
      id: 'reviews' as const,
      label: `${t('product.reviewsTab')} (${product.ratingCount})`,
    },
  ] as const;

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (event.key === 'ArrowRight') {
      setActive(tabs[(index + 1) % tabs.length]!.id);
    } else if (event.key === 'ArrowLeft') {
      setActive(tabs[(index - 1 + tabs.length) % tabs.length]!.id);
    }
  };

  return (
    <section className="mt-10 lg:mt-14">
      <div
        role="tablist"
        aria-label={t('product.description')}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-ink-200"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            className={cn(
              'relative min-h-12 whitespace-nowrap px-4 text-sm font-semibold transition-colors',
              active === tab.id
                ? 'text-brand-700'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {tab.label}
            {active === tab.id ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {active === 'description' ? (
          <div
            id="panel-description"
            role="tabpanel"
            aria-labelledby="tab-description"
            lang={locale}
            className="max-w-3xl space-y-4 text-[0.95rem] leading-relaxed text-ink-700"
          >
            {pick(product.description, product.descriptionTa)
              .split('\n')
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

            {product.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-2">
                {product.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {active === 'specs' ? (
          <div
            id="panel-specs"
            role="tabpanel"
            aria-labelledby="tab-specs"
            className="max-w-3xl overflow-hidden rounded-card border border-ink-100"
          >
            <table className="w-full text-sm">
              <caption className="sr-only">{t('product.specifications')}</caption>
              <tbody>
                {specEntries.map(([key, value], index) => (
                  <tr
                    key={key}
                    className={cn(index % 2 === 0 ? 'bg-surface' : 'bg-ink-50/70')}
                  >
                    <th
                      scope="row"
                      className="w-2/5 px-4 py-3 text-left font-semibold text-ink-600"
                    >
                      {key}
                    </th>
                    <td className="px-4 py-3 text-ink-900">{value}</td>
                  </tr>
                ))}
                <tr className="bg-surface">
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink-600">
                    {t('product.brand')}
                  </th>
                  <td className="px-4 py-3 text-ink-900">{product.brand}</td>
                </tr>
                <tr className="bg-ink-50/70">
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-ink-600">
                    {t('product.sku')}
                  </th>
                  <td className="px-4 py-3 font-mono text-ink-900">{product.sku}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        {active === 'reviews' ? (
          <div
            id="panel-reviews"
            role="tabpanel"
            aria-labelledby="tab-reviews"
            className="max-w-3xl"
          >
            {product.reviews.length > 0 ? (
              <div className="mb-8 flex flex-wrap items-center gap-6 rounded-card border border-ink-100 bg-surface p-5">
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-ink-900">
                    {product.ratingAvg.toFixed(1)}
                  </p>
                  <StarRating
                    value={product.ratingAvg}
                    size="md"
                    showValue={false}
                    className="mt-1 justify-center"
                  />
                  <p className="mt-1 text-xs text-ink-500">
                    {t('product.reviewCount', { count: product.ratingCount })}
                  </p>
                </div>
                <div className="min-w-48 flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = product.reviews.length;
                    const matching = product.reviews.filter(
                      (review) => review.rating === star,
                    ).length;
                    const percent = total > 0 ? (matching / total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-8 text-ink-500">{star}★</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className="block h-full rounded-full bg-gold-400"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="w-6 text-right text-ink-400">{matching}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <ReviewForm
              productId={product.id}
              canReview={canReview}
              isSignedIn={isSignedIn}
            />

            {product.reviews.length === 0 ? (
              <p className="mt-6 rounded-card border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
                {t('product.noReviews')}
              </p>
            ) : (
              <ul className="mt-8 space-y-5">
                {product.reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                          {review.authorName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink-900">
                            {review.authorName}
                          </p>
                          <StarRating
                            value={review.rating}
                            showValue={false}
                            className="mt-0.5"
                          />
                        </div>
                      </div>
                      <time
                        dateTime={review.createdAt}
                        className="text-xs text-ink-400"
                      >
                        {formatDate(review.createdAt)}
                      </time>
                    </div>
                    {review.title ? (
                      <p className="mt-3 text-sm font-bold text-ink-900">{review.title}</p>
                    ) : null}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                      {review.comment}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
