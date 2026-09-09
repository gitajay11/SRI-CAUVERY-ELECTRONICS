import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { HeartIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'My wishlist',
  path: '/wishlist',
  noIndex: true,
});

export default async function WishlistPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  if (!user) redirect('/signin?next=/wishlist');

  const products = await getRepository().listWishlist(user.id);

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('wishlist.title'), path: '/wishlist' },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('wishlist.title')}
        </h1>
        {products.length > 0 ? (
          <p className="mt-1 text-sm text-ink-500">
            {t('wishlist.count', { count: products.length })}
          </p>
        ) : null}
      </header>

      {products.length === 0 ? (
        <EmptyState
          icon={<HeartIcon />}
          title={t('wishlist.empty.title')}
          body={t('wishlist.empty.body')}
          action={<ButtonLink href="/shop">{t('cart.empty.cta')}</ButtonLink>}
        />
      ) : (
        <ProductGrid products={products} priorityCount={4} />
      )}
    </div>
  );
}
