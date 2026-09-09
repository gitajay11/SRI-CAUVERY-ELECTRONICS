'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductFacets } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR, paiseToRupees } from '@tamizh/core/money';
import {
  buildHref,
  toggleInList,
  type SearchParamsInput,
} from '@/lib/product-query';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { CheckIcon, CloseIcon, FilterIcon, StarIcon } from '@/components/ui/Icons';

/**
 * Faceted filters.
 *
 * Every control is a link that changes the URL, so filtering works without
 * JavaScript, is shareable, and leaves the server rendering the authoritative
 * result. On phones the same panel opens as a bottom sheet.
 */

interface FilterProps {
  facets: ProductFacets;
  params: SearchParamsInput;
  basePath: string;
  /** Total matching the current filters, shown on the mobile apply button. */
  total: number;
  activeCount: number;
  /** Hidden when the page is already scoped to one category. */
  showCategories?: boolean;
}

export function FilterPanel(props: FilterProps) {
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-40 max-h-[calc(100dvh-11rem)] overflow-y-auto pr-2">
          <FilterBody {...props} />
        </div>
      </aside>
      <MobileFilterSheet {...props} />
    </>
  );
}

function FilterBody({
  facets,
  params,
  basePath,
  activeCount,
  showCategories = true,
  onNavigate,
}: FilterProps & { onNavigate?: () => void }) {
  const { t, locale } = useLocale();

  const isChecked = (key: string, value: string) => {
    const raw = params[key];
    const current = Array.isArray(raw) ? raw.join(',') : raw;
    return (current?.split(',') ?? []).includes(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink-900">{t('shop.filters')}</h2>
        {activeCount > 0 ? (
          <Link
            href={basePath}
            onClick={onNavigate}
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            {t('common.clearAll')}
          </Link>
        ) : null}
      </div>

      {showCategories && facets.categories.length > 1 ? (
        <FilterGroup title={t('shop.filter.category')}>
          {facets.categories.map((facet) => (
            <FilterCheckbox
              key={facet.value}
              checked={isChecked('categories', facet.value)}
              href={buildHref(basePath, params, {
                categories: toggleInList(params.categories, facet.value),
              })}
              onNavigate={onNavigate}
              count={facet.count}
            >
              {locale === 'ta' && facet.labelTa ? facet.labelTa : facet.label}
            </FilterCheckbox>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title={t('shop.filter.price')}>
        <PriceFilter
          facets={facets}
          params={params}
          basePath={basePath}
          onNavigate={onNavigate}
        />
      </FilterGroup>

      {facets.brands.length > 1 ? (
        <FilterGroup title={t('shop.filter.brand')}>
          {facets.brands.map((facet) => (
            <FilterCheckbox
              key={facet.value}
              checked={isChecked('brands', facet.value)}
              href={buildHref(basePath, params, {
                brands: toggleInList(params.brands, facet.value),
              })}
              onNavigate={onNavigate}
              count={facet.count}
            >
              {facet.label}
            </FilterCheckbox>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title={t('shop.filter.rating')}>
        {[4, 3, 2].map((rating) => {
          const active = String(rating) === (params.minRating as string);
          return (
            <FilterCheckbox
              key={rating}
              checked={active}
              href={buildHref(basePath, params, { minRating: active ? null : rating })}
              onNavigate={onNavigate}
            >
              <span className="flex items-center gap-1.5">
                <span className="flex text-sm text-gold-500">
                  {Array.from({ length: rating }, (_, index) => (
                    <StarIcon key={index} filled />
                  ))}
                </span>
                <span className="text-ink-500">&amp; up</span>
              </span>
            </FilterCheckbox>
          );
        })}
      </FilterGroup>

      <FilterGroup title={t('shop.filter.discount')}>
        {[20, 30, 40, 50].map((percent) => {
          const active = String(percent) === (params.minDiscount as string);
          return (
            <FilterCheckbox
              key={percent}
              checked={active}
              href={buildHref(basePath, params, {
                minDiscount: active ? null : percent,
              })}
              onNavigate={onNavigate}
            >
              {t('shop.filter.discountAndUp', { percent })}
            </FilterCheckbox>
          );
        })}
      </FilterGroup>

      <FilterGroup title={t('shop.filter.availability')}>
        <FilterCheckbox
          checked={params.inStock === '1'}
          href={buildHref(basePath, params, {
            inStock: params.inStock === '1' ? null : 1,
          })}
          onNavigate={onNavigate}
        >
          {t('shop.filter.inStock')}
        </FilterCheckbox>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-ink-500">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function FilterCheckbox({
  checked,
  href,
  count,
  onNavigate,
  children,
}: {
  checked: boolean;
  href: string;
  count?: number;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onNavigate}
      aria-pressed={checked}
      className={cn(
        'flex min-h-10 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
        checked ? 'font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-100',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
          checked
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-ink-300 bg-surface',
        )}
      >
        {checked ? <CheckIcon className="text-xs" /> : null}
      </span>
      <span className="flex-1">{children}</span>
      {count !== undefined ? (
        <span className="text-xs text-ink-400">{count}</span>
      ) : null}
    </Link>
  );
}

/** Price presets plus an explicit min/max form. */
function PriceFilter({
  facets,
  params,
  basePath,
  onNavigate,
}: {
  facets: ProductFacets;
  params: SearchParamsInput;
  basePath: string;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [min, setMin] = useState((params.minPrice as string) ?? '');
  const [max, setMax] = useState((params.maxPrice as string) ?? '');

  const floor = Math.floor(paiseToRupees(facets.priceMin));
  const ceiling = Math.ceil(paiseToRupees(facets.priceMax));

  const brackets = [
    { label: `Under ${formatINR(50000)}`, min: undefined, max: 500 },
    { label: `${formatINR(50000)} – ${formatINR(100000)}`, min: 500, max: 1000 },
    { label: `${formatINR(100000)} – ${formatINR(250000)}`, min: 1000, max: 2500 },
    { label: `Above ${formatINR(250000)}`, min: 2500, max: undefined },
  ].filter((bracket) => (bracket.min ?? 0) <= ceiling && (bracket.max ?? Infinity) >= floor);

  return (
    <div className="space-y-2">
      {brackets.map((bracket) => {
        const active =
          String(bracket.min ?? '') === ((params.minPrice as string) ?? '') &&
          String(bracket.max ?? '') === ((params.maxPrice as string) ?? '');
        return (
          <FilterCheckbox
            key={bracket.label}
            checked={active}
            onNavigate={onNavigate}
            href={buildHref(basePath, params, {
              minPrice: active ? null : (bracket.min ?? null),
              maxPrice: active ? null : (bracket.max ?? null),
            })}
          >
            {bracket.label}
          </FilterCheckbox>
        );
      })}

      <form
        className="flex items-end gap-2 pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          onNavigate?.();
          router.push(
            buildHref(basePath, params, {
              minPrice: min === '' ? null : Number(min),
              maxPrice: max === '' ? null : Number(max),
            }),
            { scroll: false },
          );
        }}
      >
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-500">{t('shop.filter.min')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder={String(floor)}
            className="w-full rounded-lg border border-ink-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-500">{t('shop.filter.max')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder={String(ceiling)}
            className="w-full rounded-lg border border-ink-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <button
          type="submit"
          className="min-h-10 shrink-0 rounded-lg bg-ink-900 px-3 text-sm font-semibold text-white"
        >
          {t('common.apply')}
        </button>
      </form>
    </div>
  );
}

/** Bottom sheet wrapper for phones and tablets. */
function MobileFilterSheet(props: FilterProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="lg:hidden"
        aria-expanded={open}
      >
        <FilterIcon className="text-[1.15em]" />
        {t('shop.filters')}
        {props.activeCount > 0 ? (
          <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {props.activeCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('shop.filters')}
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] animate-slide-up flex-col rounded-t-3xl bg-paper"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h2 className="text-base font-bold">{t('shop.filters')}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="grid size-10 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
              >
                <CloseIcon className="text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <FilterBody {...props} onNavigate={() => setOpen(false)} />
            </div>

            <div
              className="border-t border-ink-100 bg-surface p-3"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <Button fullWidth size="lg" onClick={() => setOpen(false)}>
                {t('shop.filtersApply', { count: props.total })}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
