import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { parseProductSearchParams, type SearchParamsInput } from '@/lib/product-query';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ProductBrowser } from '@/components/shop/ProductBrowser';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}): Promise<Metadata> {
  const params = await searchParams;
  const { t } = await getI18n();
  const hasFilters = Object.keys(params).length > 0;

  return buildMetadata({
    title: t('shop.title'),
    description:
      'Browse every product at Sri Cauvery Electronics — chargers, cables, earphones, speakers, power banks, LED lighting and return gifts for every occasion.',
    path: '/shop',
    // Filtered permutations are near-duplicates; only the clean grid is indexed.
    noIndex: hasFilters,
  });
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const params = await searchParams;
  const { t } = await getI18n();
  const query = parseProductSearchParams(params);
  const result = await getRepository().searchProducts(query);

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('shop.title'), path: '/shop' },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('shop.title')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 sm:text-base">{t('shop.subtitle')}</p>
      </header>

      <ProductBrowser result={result} params={params} basePath="/shop" />
    </div>
  );
}
