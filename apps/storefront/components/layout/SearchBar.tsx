'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ProductCardView } from '@tamizh/core/types';
import { api } from '@/lib/http';
import { formatINR } from '@tamizh/core/money';
import { cn } from '@tamizh/core/utils';
import { POPULAR_SEARCHES } from '@/lib/storefront-content';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CloseIcon, SearchIcon, SpinnerIcon } from '@/components/ui/Icons';

/**
 * Product search with type-ahead.
 *
 * Suggestions are debounced and aborted on each keystroke so a slow connection
 * cannot deliver stale results after a newer query. The listbox follows the
 * combobox pattern: arrow keys move a highlighted option, Enter opens it, and
 * Escape returns focus to the input.
 */

const DEBOUNCE_MS = 220;
const MIN_CHARS = 2;

export function SearchBar({
  autoFocus = false,
  compact = false,
  onNavigate,
  className,
}: {
  autoFocus?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useLocale();
  const listboxId = useId();

  const [term, setTerm] = useState(() => params.get('q') ?? '');
  /**
   * Suggestions are stored together with the term they belong to, so a slow
   * response for an older query is simply ignored instead of having to be
   * cleared from an effect.
   */
  const [results, setResults] = useState<{
    term: string;
    items: ProductCardView[];
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = term.trim();
  const ready = trimmed.length >= MIN_CHARS;
  const options = results?.term === trimmed ? results.items : [];
  const loading = ready && results?.term !== trimmed;

  useEffect(() => {
    const query = term.trim();
    if (query.length < MIN_CHARS) return;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const data = await api.get<{ products: ProductCardView[] }>(
          `/api/search/suggest?q=${encodeURIComponent(query)}`,
        );
        if (!controller.signal.aborted) {
          setResults({ term: query, items: data.products });
          setActiveIndex(-1);
        }
      } catch {
        if (!controller.signal.aborted) setResults({ term: query, items: [] });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term]);

  // Close the panel when focus or a click lands outside it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      const active = activeIndex >= 0 ? options[activeIndex] : undefined;
      if (active) {
        event.preventDefault();
        setOpen(false);
        onNavigate?.();
        router.push(`/product/${active.slug}`);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(term);
        }}
      >
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border border-ink-200 bg-surface pl-4 pr-1.5 transition-shadow',
            'focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10',
            compact ? 'h-11' : 'h-12',
          )}
        >
          <SearchIcon className="shrink-0 text-lg text-ink-400" />
          <input
            ref={inputRef}
            type="search"
            value={term}
            autoFocus={autoFocus}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={compact ? t('search.placeholderShort') : t('search.placeholder')}
            aria-label={t('search.submit')}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            className="min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] text-ink-900 outline-none placeholder:text-ink-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {term ? (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                inputRef.current?.focus();
              }}
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label={t('common.clear')}
            >
              <CloseIcon />
            </button>
          ) : null}
          <button
            type="submit"
            className="hidden h-9 shrink-0 items-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            {t('search.submit')}
          </button>
        </div>
      </form>

      {open ? (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card-hover"
          role="presentation"
        >
          {!ready ? (
            <div className="p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {t('search.popular')}
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setTerm(suggestion);
                      submit(suggestion);
                    }}
                    className="rounded-full bg-ink-100 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-ink-500">
              <SpinnerIcon /> {t('common.loading')}
            </p>
          ) : options.length === 0 ? (
            <p className="p-4 text-sm text-ink-500">
              {t('search.noResults', { query: trimmed })}
            </p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label={t('search.suggestions')}>
              {options.map((product, index) => (
                <li key={product.id} role="none">
                  <Link
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    href={`/product/${product.slug}`}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 transition-colors',
                      index === activeIndex ? 'bg-brand-50' : 'hover:bg-ink-50',
                    )}
                  >
                    {product.image ? (
                      <Image
                        src={product.image.url}
                        alt=""
                        width={44}
                        height={44}
                        className="size-11 shrink-0 rounded-lg border border-ink-100 object-cover"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-sm font-medium text-ink-900">
                        {locale === 'ta' && product.nameTa ? product.nameTa : product.name}
                      </span>
                      <span className="block text-xs text-ink-400">
                        {product.categoryName}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-brand-700">
                      {formatINR(product.price)}
                    </span>
                  </Link>
                </li>
              ))}
              <li role="none" className="border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => submit(term)}
                  className="w-full px-4 py-3 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  {t('search.viewAllResults', { query: trimmed })}
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
