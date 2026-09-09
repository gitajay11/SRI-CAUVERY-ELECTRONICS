import Link from 'next/link';
import type { ProductSearchResult, SortKey } from '@tamizh/core/types';
import { getI18n } from '@/i18n/server';
import { activeFilterCount, type SearchParamsInput } from '@/lib/product-query';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { SearchIcon } from '@/components/ui/Icons';
import { FilterPanel } from './FilterPanel';
import { SortSelect } from './SortSelect';
import { Pagination } from './Pagination';
import { ActiveFilterChips } from './ActiveFilterChips';

/**
 * The shared "grid + filters" layout used by /shop, /search and every
 * category page, so all three behave identically.
 */
export async function ProductBrowser({
  result,
  params,
  basePath,
  showCategories = true,
  emptyTitle,
  emptyBody,
}: {
  result: ProductSearchResult;
  params: SearchParamsInput;
  basePath: string;
  showCategories?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const { t } = await getI18n();
  const count = activeFilterCount(params);
  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);
  const sort = ((params.sort as SortKey) ?? 'relevance') as SortKey;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
      <FilterPanel
        facets={result.facets}
        params={params}
        basePath={basePath}
        total={result.total}
        activeCount={count}
        showCategories={showCategories}
      />

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">
            {result.total > 0
              ? t('shop.showingRange', { from, to, total: result.total })
              : t('search.countResults', { count: 0 })}
          </p>
          <div className="flex items-center gap-2">
            <SortSelect params={params} basePath={basePath} current={sort} />
          </div>
        </div>

        {count > 0 ? (
          <ActiveFilterChips params={params} basePath={basePath} facets={result.facets} />
        ) : null}

        {result.items.length === 0 ? (
          <EmptyState
            icon={<SearchIcon />}
            title={emptyTitle ?? t('shop.empty.title')}
            body={emptyBody ?? t('shop.empty.body')}
            action={
              count > 0 ? (
                <ButtonLink href={basePath} variant="secondary">
                  {t('common.clearAll')}
                </ButtonLink>
              ) : (
                <ButtonLink href="/shop">{t('nav.shop')}</ButtonLink>
              )
            }
          />
        ) : (
          <>
            <ProductGrid products={result.items} priorityCount={4} />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              params={params}
              basePath={basePath}
            />
          </>
        )}

        {/* Related category links help both shoppers and crawlers. */}
        {result.facets.categories.length > 1 ? (
          <nav aria-label={t('nav.categories')} className="mt-10 border-t border-ink-200 pt-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">
              {t('shop.filter.category')}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {result.facets.categories.slice(0, 12).map((facet) => (
                <li key={facet.value}>
                  <Link
                    href={`/categories/${facet.value}`}
                    className="inline-flex rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-sm text-ink-700 hover:border-action-edge/60 hover:text-link"
                  >
                    {facet.label}
                    <span className="ml-1.5 text-ink-400">{facet.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
