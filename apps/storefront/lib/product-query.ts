import type { ProductQuery, SortKey } from '@tamizh/core/types';
import { SORT_KEYS } from '@tamizh/core/types';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/services/constants';
import { rupeesToPaise } from '@tamizh/core/money';

/**
 * Translation between the URL and a `ProductQuery`.
 *
 * The URL is the source of truth for the shop grid: filters are shareable,
 * back/forward works, and the server can render the correct page without any
 * client state. Prices appear in the URL as rupees (readable) and are
 * converted to paise here.
 */

export type SearchParamsInput = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function list(value: string | string[] | undefined): string[] | undefined {
  const raw = Array.isArray(value) ? value.join(',') : value;
  if (!raw) return undefined;
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20);
  return parts.length > 0 ? parts : undefined;
}

function int(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw === '') return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function float(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw === '') return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseProductSearchParams(
  params: SearchParamsInput,
  overrides: Partial<ProductQuery> = {},
): ProductQuery {
  const sortRaw = first(params.sort);
  const sort = SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : undefined;

  const minRupees = int(params.minPrice);
  const maxRupees = int(params.maxPrice);
  const pageSize = int(params.pageSize);

  return {
    q: first(params.q)?.slice(0, 120) || undefined,
    category: first(params.category) || undefined,
    categories: list(params.categories),
    brands: list(params.brands),
    minPrice: minRupees !== undefined ? rupeesToPaise(minRupees) : undefined,
    maxPrice: maxRupees !== undefined ? rupeesToPaise(maxRupees) : undefined,
    minRating: float(params.minRating),
    minDiscount: int(params.minDiscount),
    inStockOnly: first(params.inStock) === '1',
    featured: first(params.featured) === '1',
    sort,
    page: Math.max(1, int(params.page) ?? 1),
    pageSize: pageSize ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
    ...overrides,
  };
}

/**
 * Builds a URL for the current page with some parameters changed.
 * Passing `null` removes a parameter; changing any filter resets `page`.
 *
 * `basePath` may carry its own query string (the search page passes
 * `/search?q=…`), and those parameters survive a "clear all".
 */
export function buildHref(
  basePath: string,
  current: SearchParamsInput,
  changes: Record<string, string | number | null | undefined>,
): string {
  const [path = basePath, pinned] = basePath.split('?');
  const next = new URLSearchParams(pinned);

  for (const [key, value] of Object.entries(current)) {
    const single = first(value);
    if (single !== undefined && single !== '') next.set(key, single);
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  }

  if (!('page' in changes)) next.delete('page');

  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

/** Toggles one value inside a comma-separated parameter. */
export function toggleInList(
  current: string | string[] | undefined,
  value: string,
): string | null {
  const values = new Set(list(current) ?? []);
  if (values.has(value)) values.delete(value);
  else values.add(value);
  return values.size > 0 ? [...values].join(',') : null;
}

export function activeFilterCount(params: SearchParamsInput): number {
  const keys = [
    'categories',
    'brands',
    'minPrice',
    'maxPrice',
    'minRating',
    'minDiscount',
    'inStock',
  ];
  return keys.filter((key) => {
    const value = first(params[key]);
    return value !== undefined && value !== '';
  }).length;
}
