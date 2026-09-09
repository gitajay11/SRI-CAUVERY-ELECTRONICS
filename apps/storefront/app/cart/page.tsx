import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { getCartView } from '@/services/cart';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { CartLines } from '@/components/cart/CartLines';
import { CartSummary } from '@/components/cart/CartSummary';
import { Alert, EmptyState, SectionHeading } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { ProductRail } from '@/components/product/ProductGrid';
import { AlertIcon, CartIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'Shopping cart',
  path: '/cart',
  noIndex: true,
});

export default async function CartPage() {
  const { t } = await getI18n();
  const cart = await getCartView();

  if (cart.items.length === 0) {
    const suggestions = await getRepository().listBestSellers(8);
    return (
      <div className="container-page py-8 lg:py-12">
        <EmptyState
          icon={<CartIcon />}
          title={t('cart.empty.title')}
          body={t('cart.empty.body')}
          action={<ButtonLink href="/shop" size="lg">{t('cart.empty.cta')}</ButtonLink>}
        />
        {suggestions.length > 0 ? (
          <section className="mt-12">
            <SectionHeading title={t('home.bestSellers.title')} />
            <ProductRail products={suggestions} />
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('cart.title'), path: '/cart' },
        ]}
      />

      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('cart.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {cart.itemCount === 1
            ? t('cart.itemCount', { count: cart.itemCount })
            : t('cart.itemCountPlural', { count: cart.itemCount })}
        </p>
      </header>

      {cart.notices.length > 0 ? (
        <div className="mb-5 space-y-2">
          {cart.notices.map((notice) => (
            <Alert key={notice} tone="warning" icon={<AlertIcon />}>
              {notice}
            </Alert>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
        <CartLines items={cart.items} />
        <CartSummary cart={cart} className="lg:sticky lg:top-40" />
      </div>
    </div>
  );
}
