'use client';

import Link from 'next/link';
import { cn } from '@tamizh/core/utils';
import { buildHref, type SearchParamsInput } from '@/lib/product-query';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';

/**
 * Page links.
 *
 * Real anchors so pages are crawlable and open in a new tab, with an elided
 * window of numbers that stays narrow enough for a phone.
 */
export function Pagination({
  page,
  totalPages,
  params,
  basePath,
}: {
  page: number;
  totalPages: number;
  params: SearchParamsInput;
  basePath: string;
}) {
  const { t } = useLocale();
  if (totalPages <= 1) return null;

  const href = (target: number) =>
    buildHref(basePath, params, { page: target === 1 ? null : target });

  // Always show first, last, current and its neighbours.
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav
      aria-label={t('shop.page', { page, total: totalPages })}
      className="mt-8 flex items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="flex min-h-11 items-center gap-1 rounded-full border border-ink-200 bg-surface px-3.5 text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
        >
          <ChevronLeftIcon />
          <span className="hidden sm:inline">{t('shop.previous')}</span>
        </Link>
      ) : null}

      {visible.map((value, index) => {
        const previous = visible[index - 1];
        const gap = previous !== undefined && value - previous > 1;
        return (
          <span key={value} className="flex items-center gap-1.5">
            {gap ? (
              <span className="px-1 text-ink-400" aria-hidden="true">
                …
              </span>
            ) : null}
            <Link
              href={href(value)}
              aria-current={value === page ? 'page' : undefined}
              className={cn(
                'grid size-11 place-items-center rounded-full text-sm font-semibold transition-colors',
                value === page
                  ? 'bg-brand-600 text-white'
                  : 'border border-ink-200 bg-surface text-ink-700 hover:border-brand-300 hover:text-brand-700',
              )}
            >
              {value}
            </Link>
          </span>
        );
      })}

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="flex min-h-11 items-center gap-1 rounded-full border border-ink-200 bg-surface px-3.5 text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
        >
          <span className="hidden sm:inline">{t('shop.next')}</span>
          <ChevronRightIcon />
        </Link>
      ) : null}
    </nav>
  );
}
