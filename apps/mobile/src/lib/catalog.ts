import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type {
  CategoryView,
  Locale,
  ProductCardView,
  ProductDetailView,
  ProductSearchResult,
  SortKey,
} from '@tamizh/core/types';
import { api } from './api';

/**
 * The catalogue reads, as React Query hooks. Every one is public and the same
 * for every shopper, so they share the default one-minute freshness.
 */

export interface HomeData {
  categories: CategoryView[];
  featured: ProductCardView[];
  bestSellers: ProductCardView[];
  newArrivals: ProductCardView[];
  returnGifts: ProductCardView[];
  bestOffers: ProductCardView[];
}

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: ({ signal }) => api.get<HomeData>('/api/home', signal),
  });
}

/**
 * The category tree, taken from the home payload: one cached request serves
 * both tabs. (`/api/categories` has been seen answering an empty list from a
 * stale cache entry while `/api/home` answered correctly.)
 */
export function useCategories() {
  return useQuery({
    queryKey: ['home'],
    queryFn: ({ signal }) => api.get<HomeData>('/api/home', signal),
    select: (data) => data.categories,
  });
}

/** The listing's filters, as the storefront's `/api/products` reads them. */
export interface ProductFilters {
  q?: string;
  category?: string;
  sort?: SortKey;
  brands?: string[];
  /** Rupees, as in the website's URLs. */
  minPrice?: number;
  /** Rupees. */
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  inStock?: boolean;
  featured?: boolean;
}

const PAGE_SIZE = 20;

export function filtersToQuery(filters: ProductFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.brands?.length) params.set('brands', filters.brands.join(','));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minRating) params.set('minRating', String(filters.minRating));
  if (filters.minDiscount) params.set('minDiscount', String(filters.minDiscount));
  if (filters.inStock) params.set('inStock', '1');
  if (filters.featured) params.set('featured', '1');
  params.set('page', String(page));
  params.set('pageSize', String(PAGE_SIZE));
  return params.toString();
}

/** How many of the optional filters (not search, category or sort) are set. */
export function activeFilterCount(filters: ProductFilters): number {
  return [
    filters.brands?.length,
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.minRating,
    filters.minDiscount,
    filters.inStock,
  ].filter(Boolean).length;
}

/** The product grid, a page at a time as the shopper scrolls. */
export function useProductSearch(filters: ProductFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam, signal }) =>
      api.get<ProductSearchResult>(`/api/products?${filtersToQuery(filters, pageParam)}`, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    // Changing a filter keeps the old grid on screen until the new one lands.
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: ({ signal }) =>
      api.get<{ product: ProductDetailView; related: ProductCardView[] }>(
        `/api/products/${encodeURIComponent(slug)}`,
        signal,
      ),
  });
}

/** Type-ahead results; asks nothing until two characters are typed. */
export function useSuggestions(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ['suggest', q],
    queryFn: ({ signal }) =>
      api.get<{ products: ProductCardView[] }>(
        `/api/search/suggest?q=${encodeURIComponent(q)}`,
        signal,
      ),
    select: (data) => data.products,
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/** A product's or category's name in the shopper's language. */
export function localName(item: { name: string; nameTa: string | null }, locale: Locale): string {
  return locale === 'ta' && item.nameTa ? item.nameTa : item.name;
}
