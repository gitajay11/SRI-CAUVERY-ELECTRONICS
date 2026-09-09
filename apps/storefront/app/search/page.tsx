import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { POPULAR_SEARCHES } from '@/lib/storefront-content';
import { parseProductSearchParams, type SearchParamsInput } from '@/lib/product-query';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ProductBrowser } from '@/components/shop/ProductBrowser';
import { EmptyState } from '@/components/ui/Primitives';
import { SearchIcon } from '@/components/ui/Icons';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';

  return buildMetadata({
    title: query ? `Search: ${query}` : 'Search',
    description: `Search results for "${query}" at Sri Cauvery Electronics.`,
    path: '/search',
    // Search result pages are user-specific and endless; keep them out of the
    // index while remaining fully crawlable for the shopper.
    noIndex: true,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const params = await searchParams;
  const { t } = await getI18n();
  const term = (typeof params.q === 'string' ? params.q : '').trim();

  if (!term) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={<SearchIcon />}
          title={t('search.placeholderShort')}
          body={t('search.noResultsHint')}
          action={
            <ul className="flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.map((suggestion) => (
                <li key={suggestion}>
                  <Link
                    href={`/search?q=${encodeURIComponent(suggestion)}`}
                    className="inline-flex rounded-full bg-ink-100 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-success-50 hover:text-link"
                  >
                    {suggestion}
                  </Link>
                </li>
              ))}
            </ul>
          }
        />
      </div>
    );
  }

  const query = parseProductSearchParams(params);
  const result = await getRepository().searchProducts(query);

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('nav.search'), path: `/search?q=${encodeURIComponent(term)}` },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('search.resultsFor', { query: term })}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {t('search.countResults', { count: result.total })}
        </p>
      </header>

      <ProductBrowser
        result={result}
        params={params}
        basePath={`/search?q=${encodeURIComponent(term)}`}
        emptyTitle={t('search.noResults', { query: term })}
        emptyBody={t('search.noResultsHint')}
      />
    </div>
  );
}
