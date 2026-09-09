'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { buildQuery, first, type SearchParams } from '@/lib/query';
import { useAdmin } from '@/components/providers/AdminProviders';
import { Select } from '@/components/ui/Field';
import { CloseIcon, FilterIcon, SearchIcon } from '@/components/ui/Icons';

/**
 * Search and filters for every list screen.
 *
 * Everything writes to the URL rather than to component state, so filtered
 * views are shareable and the server renders the authoritative result.
 *
 * On desktop the controls sit in a row; on a phone they collapse behind a
 * "Filters" button with a count, because four selects side by side at 375px is
 * unusable.
 */

export interface SelectFilter {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  /**
   * What the control reads when nothing is chosen. Defaults to the filter's
   * own name, because three dropdowns side by side all reading "View all" tell
   * a member of staff nothing about which is which — the closed control has to
   * say what it filters.
   */
  placeholder?: string;
}

export interface ToggleFilter {
  name: string;
  label: string;
  value: string;
}

export function FilterBar({
  basePath,
  params,
  searchPlaceholder,
  selects = [],
  toggles = [],
  action,
}: {
  basePath: string;
  params: SearchParams;
  searchPlaceholder: string;
  selects?: SelectFilter[];
  toggles?: ToggleFilter[];
  /** A primary action, e.g. "New product". */
  action?: React.ReactNode;
}) {
  const { t } = useAdmin();
  const router = useRouter();
  const [term, setTerm] = useState(first(params.q) ?? '');
  const [open, setOpen] = useState(false);

  const go = (changes: Record<string, string | number | null>) => {
    router.push(buildQuery(basePath, params, changes));
  };

  const activeCount =
    selects.filter((select) => select.value !== '').length +
    toggles.filter((toggle) => first(params[toggle.name]) === toggle.value).length;

  /**
   * The empty option carries the filter's name rather than a generic "view
   * all", so a closed control reads "Status" when unset and "Delivered" when
   * set — which is what the row has to communicate at a glance.
   */
  const optionsFor = (select: SelectFilter) =>
    select.options.map((option) =>
      option.value === ''
        ? { ...option, label: select.placeholder ?? select.label }
        : option,
    );

  const controls = (
    <>
      {selects.map((select) => (
        <Select
          key={select.name}
          size="sm"
          aria-label={select.label}
          value={select.value}
          onChange={(event) => go({ [select.name]: event.target.value || null })}
          className={cn(select.value !== '' && 'border-brand-500 text-link')}
        >
          {optionsFor(select).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ))}

      {toggles.map((toggle) => {
        const active = first(params[toggle.name]) === toggle.value;
        return (
          <button
            key={toggle.name}
            type="button"
            aria-pressed={active}
            onClick={() => go({ [toggle.name]: active ? null : toggle.value })}
            className={cn(
              'h-10 rounded-lg border px-3 text-sm font-medium transition-colors',
              active
                ? 'border-brand-500 bg-success-50 text-link'
                : 'border-slate-300 bg-surface text-slate-600 hover:border-slate-400',
            )}
          >
            {toggle.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="min-w-52 flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: term.trim() || null });
        }}
      >
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-surface px-3 transition-colors focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15 hover:border-slate-400">
          <SearchIcon className="shrink-0 text-base text-slate-400" />
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {term ? (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                go({ q: null });
              }}
              aria-label={t('common.clear')}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <CloseIcon className="text-sm" />
            </button>
          ) : null}
        </label>
      </form>

      {/* Desktop: inline controls */}
      {selects.length > 0 || toggles.length > 0 ? (
        <div className="hidden items-center gap-2 md:flex">{controls}</div>
      ) : null}

      {/* Mobile: a sheet */}
      {selects.length > 0 || toggles.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium md:hidden',
            activeCount > 0
              ? 'border-brand-500 bg-success-50 text-link'
              : 'border-slate-300 bg-surface text-slate-600',
          )}
        >
          <FilterIcon className="text-base" />
          {t('common.filters')}
          {activeCount > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {activeCount > 0 ? (
        <Link
          href={basePath}
          className="hidden text-sm font-medium text-link hover:underline md:inline"
        >
          {t('common.clearAll')}
        </Link>
      ) : null}

      {action ? <div className="ml-auto">{action}</div> : null}

      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-carbon-950/60 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('common.filters')}
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] animate-slide-up overflow-y-auto rounded-t-2xl bg-surface"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">
                {t('common.filters')}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <CloseIcon className="text-xl" />
              </button>
            </div>

            <div
              className="flex flex-col gap-3 p-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              {selects.map((select) => (
                <label key={select.name} className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    {select.label}
                  </span>
                  <Select
                    value={select.value}
                    onChange={(event) => {
                      go({ [select.name]: event.target.value || null });
                      setOpen(false);
                    }}
                  >
                    {optionsFor(select).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}

              {toggles.map((toggle) => {
                const active = first(params[toggle.name]) === toggle.value;
                return (
                  <button
                    key={toggle.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      go({ [toggle.name]: active ? null : toggle.value });
                      setOpen(false);
                    }}
                    className={cn(
                      'min-h-11 rounded-lg border px-3 text-sm font-medium',
                      active
                        ? 'border-brand-500 bg-success-50 text-link'
                        : 'border-slate-300 text-slate-600',
                    )}
                  >
                    {toggle.label}
                  </button>
                );
              })}

              {activeCount > 0 ? (
                <Link
                  href={basePath}
                  onClick={() => setOpen(false)}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-medium text-slate-600"
                >
                  {t('common.clearAll')}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
