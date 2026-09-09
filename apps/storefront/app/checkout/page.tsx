import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getCartView } from '@/services/cart';
import { getRepository } from '@/services/repository';
import { getSessionUser } from '@/lib/auth';
import { onlinePaymentAvailable } from '@/services/payments';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Alert } from '@/components/ui/Primitives';
import { AlertIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'Checkout',
  path: '/checkout',
  noIndex: true,
});

export default async function CheckoutPage() {
  const { t } = await getI18n();
  const cart = await getCartView();

  // Nothing to check out — send the shopper back rather than showing an empty,
  // unsubmittable form.
  if (cart.items.length === 0) redirect('/cart');

  const user = await getSessionUser();
  const addresses = user ? await getRepository().listAddresses(user.id) : [];

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('cart.title'), path: '/cart' },
          { name: t('checkout.title'), path: '/checkout' },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('checkout.title')}
        </h1>
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

      <CheckoutForm
        cart={cart}
        user={user}
        addresses={addresses}
        onlinePaymentAvailable={onlinePaymentAvailable()}
      />
    </div>
  );
}
