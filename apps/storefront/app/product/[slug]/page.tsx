import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { getSessionUser } from '@/lib/auth';
import { buildMetadata, productJsonLd } from '@/lib/seo';
import { formatINR, savings } from '@tamizh/core/money';
import { truncate } from '@tamizh/core/utils';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Badge, SectionHeading, StarRating } from '@/components/ui/Primitives';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductPurchasePanel } from '@/components/product/ProductPurchasePanel';
import { ProductTabs } from '@/components/product/ProductTabs';
import { CheckIcon, ShieldIcon, TruckIcon } from '@/components/ui/Icons';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getRepository().getProductBySlug(slug);
  if (!product) return buildMetadata({ title: 'Product not found', noIndex: true });

  return buildMetadata({
    title: product.name,
    description: truncate(product.description, 155),
    path: `/product/${product.slug}`,
    image: product.images[0]?.url ?? '/brand/og-image.png',
    type: 'article',
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const repo = getRepository();

  const product = await repo.getProductBySlug(slug);
  if (!product) notFound();

  const user = await getSessionUser();
  const [related, hasPurchased] = await Promise.all([
    repo.listRelated(product.id, 8),
    user ? repo.hasPurchased(user.id, product.id) : Promise.resolve(false),
  ]);

  const name = locale === 'ta' && product.nameTa ? product.nameTa : product.name;
  const saved = savings(product.mrp, product.price);
  const outOfStock = product.stock <= 0;

  return (
    <div className="container-page py-4 lg:py-8">
      <JsonLd data={productJsonLd(product)} />

      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('nav.categories'), path: '/categories' },
          {
            name:
              locale === 'ta' && product.category.nameTa
                ? product.category.nameTa
                : product.category.name,
            path: `/categories/${product.category.slug}`,
          },
          { name, path: `/product/${product.slug}` },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          images={product.images}
          productName={product.name}
          badge={
            product.discountPercent > 0 ? (
              <span className="rounded-full bg-gold-500 px-3 py-1.5 text-sm font-bold text-on-action shadow-sm">
                {t('product.off', { percent: product.discountPercent })}
              </span>
            ) : null
          }
        />

        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-link">
            {product.brand}
          </p>

          <h1
            lang={locale}
            className="mt-1.5 text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl"
          >
            {name}
          </h1>

          {locale === 'ta' && product.nameTa ? (
            <p className="mt-1 text-sm text-ink-500">{product.name}</p>
          ) : product.nameTa ? (
            <p lang="ta" className="font-tamil mt-1 text-sm text-ink-500">
              {product.nameTa}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {product.ratingCount > 0 ? (
              <StarRating
                value={product.ratingAvg}
                count={product.ratingCount}
                size="md"
              />
            ) : null}
            {product.soldCount > 100 ? (
              <span className="text-sm text-ink-500">
                {t('product.sold', { count: product.soldCount.toLocaleString('en-IN') })}
              </span>
            ) : null}
            <span className="font-mono text-xs text-ink-400">
              {t('product.sku')}: {product.sku}
            </span>
          </div>

          {/* Price */}
          <div className="mt-5 rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold text-ink-900 sm:text-4xl">
                {formatINR(product.price)}
              </span>
              {product.mrp > product.price ? (
                <>
                  <span className="text-lg text-ink-400 line-through">
                    {formatINR(product.mrp)}
                  </span>
                  <Badge tone="gold">
                    {t('product.off', { percent: product.discountPercent })}
                  </Badge>
                </>
              ) : null}
            </div>
            {saved > 0 ? (
              <p className="mt-1.5 text-sm font-semibold text-success-500">
                {t('product.save', { amount: formatINR(saved) })}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-ink-400">{t('product.inclusiveTax')}</p>

            <p className="mt-3.5 flex items-center gap-2 text-sm font-semibold">
              {outOfStock ? (
                <Badge tone="danger">{t('product.outOfStock')}</Badge>
              ) : (
                <Badge tone="success">
                  <CheckIcon className="text-[1.05em]" />
                  {t('product.inStock')}
                </Badge>
              )}
            </p>
          </div>

          <div className="mt-5">
            <ProductPurchasePanel product={product} />
          </div>

          {/* Delivery reassurance */}
          <section className="mt-6 rounded-card border border-ink-100 bg-success-50/50 p-4">
            <h2 className="text-sm font-bold text-ink-800">
              {t('product.deliveryTitle')}
            </h2>
            <ul className="mt-2.5 space-y-2 text-sm text-ink-600">
              <li className="flex items-center gap-2.5">
                <TruckIcon className="shrink-0 text-base text-link" />
                {t('product.deliveryFree')}
              </li>
              <li className="flex items-center gap-2.5">
                <TruckIcon className="shrink-0 text-base text-link" />
                {t('product.deliveryEta')}
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldIcon className="shrink-0 text-base text-link" />
                {t('product.deliveryReturns')}
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldIcon className="shrink-0 text-base text-link" />
                {t('product.deliveryCod')}
              </li>
            </ul>
          </section>
        </div>
      </div>

      <ProductTabs
        product={product}
        canReview={hasPurchased}
        isSignedIn={Boolean(user)}
      />

      {related.length > 0 ? (
        <section className="mt-12 lg:mt-16">
          <SectionHeading title={t('product.related')} />
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
