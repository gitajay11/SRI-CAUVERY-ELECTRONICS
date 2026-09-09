'use client';

import Link from 'next/link';
import type { ProductFacets } from '@tamizh/core/types';
import { formatINR, rupeesToPaise } from '@tamizh/core/money';
import { buildHref, toggleInList, type SearchParamsInput } from '@/lib/product-query';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CloseIcon } from '@/components/ui/Icons';

/**
 * Removable chips for the filters currently in effect.
 *
 * Without these, a shopper who scrolls past the filter panel — or opened a
 * shared link — has no idea why the grid is short.
 */
export function ActiveFilterChips({
  params,
  basePath,
  facets,
}: {
  params: SearchParamsInput;
  basePath: string;
  facets: ProductFacets;
}) {
  const { t, locale } = useLocale();

  const asList = (value: string | string[] | undefined) => {
    const raw = Array.isArray(value) ? value.join(',') : value;
    return raw ? raw.split(',').filter(Boolean) : [];
  };

  const chips: { key: string; label: string; href: string }[] = [];

  for (const slug of asList(params.categories)) {
    const facet = facets.categories.find((item) => item.value === slug);
    chips.push({
      key: `cat-${slug}`,
      label:
        locale === 'ta' && facet?.labelTa ? facet.labelTa : (facet?.label ?? slug),
      href: buildHref(basePath, params, {
        categories: toggleInList(params.categories, slug),
      }),
    });
  }

  for (const brand of asList(params.brands)) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      href: buildHref(basePath, params, { brands: toggleInList(params.brands, brand) }),
    });
  }

  const min = params.minPrice as string | undefined;
  const max = params.maxPrice as string | undefined;
  if (min || max) {
    const label =
      min && max
        ? `${formatINR(rupeesToPaise(Number(min)))} – ${formatINR(rupeesToPaise(Number(max)))}`
        : min
          ? `≥ ${formatINR(rupeesToPaise(Number(min)))}`
          : `≤ ${formatINR(rupeesToPaise(Number(max)))}`;
    chips.push({
      key: 'price',
      label,
      href: buildHref(basePath, params, { minPrice: null, maxPrice: null }),
    });
  }

  if (params.minRating) {
    chips.push({
      key: 'rating',
      label: t('shop.filter.ratingAndUp', { rating: String(params.minRating) }),
      href: buildHref(basePath, params, { minRating: null }),
    });
  }

  if (params.minDiscount) {
    chips.push({
      key: 'discount',
      label: t('shop.filter.discountAndUp', { percent: String(params.minDiscount) }),
      href: buildHref(basePath, params, { minDiscount: null }),
    });
  }

  if (params.inStock === '1') {
    chips.push({
      key: 'stock',
      label: t('shop.filter.inStock'),
      href: buildHref(basePath, params, { inStock: null }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            scroll={false}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3 pr-2 text-sm font-medium text-brand-800 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100"
          >
            {chip.label}
            <span className="grid size-5 place-items-center rounded-full bg-brand-200/70 text-xs">
              <CloseIcon />
            </span>
            <span className="sr-only">{t('common.remove')}</span>
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={basePath}
          scroll={false}
          className="rounded-full px-2 py-1.5 text-sm font-semibold text-ink-500 hover:text-brand-700"
        >
          {t('common.clearAll')}
        </Link>
      </li>
    </ul>
  );
}
