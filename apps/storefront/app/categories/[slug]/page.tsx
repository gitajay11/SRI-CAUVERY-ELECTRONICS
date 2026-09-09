import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { parseProductSearchParams, type SearchParamsInput } from '@/lib/product-query';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ProductBrowser } from '@/components/shop/ProductBrowser';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getRepository().getCategoryBySlug(slug);
  if (!category) return buildMetadata({ title: 'Category', noIndex: true });

  return buildMetadata({
    title: category.name,
    description:
      category.description ??
      `Shop ${category.name} at Sri Cauvery Electronics with fast delivery across Tamil Nadu.`,
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<SearchParamsInput>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const { t, locale } = await getI18n();
  const repo = getRepository();

  const category = await repo.getCategoryBySlug(slug);
  if (!category) notFound();

  const query = parseProductSearchParams(search, { category: slug });
  const result = await repo.searchProducts(query);

  const name = locale === 'ta' ? category.nameTa : category.name;
  const description =
    locale === 'ta' ? category.descriptionTa : category.description;

  // Only a top-level category needs its children offered as sub-links.
  const children = category.children ?? [];

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('nav.categories'), path: '/categories' },
          { name, path: `/categories/${category.slug}` },
        ]}
      />

      <header className="mb-6 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-success-50 text-link sm:size-16">
          <CategoryIcon name={category.icon} className="size-7 sm:size-8" />
        </span>
        <div className="min-w-0">
          <h1 lang={locale} className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
            {name}
          </h1>
          {description ? (
            <p lang={locale} className="mt-1.5 max-w-2xl text-sm text-ink-500 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </header>

      {children.length > 0 ? (
        <nav aria-label={t('nav.categories')} className="mb-6">
          <ul className="snap-rail -mx-4 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/categories/${child.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-action-edge/60 hover:bg-success-50 hover:text-link"
                >
                  <CategoryIcon name={child.icon} className="size-4 text-ink-400" />
                  {locale === 'ta' ? child.nameTa : child.name}
                  <span className="text-xs text-ink-400">{child.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <ProductBrowser
        result={result}
        params={search}
        basePath={`/categories/${category.slug}`}
        showCategories={children.length > 0}
      />
    </div>
  );
}
