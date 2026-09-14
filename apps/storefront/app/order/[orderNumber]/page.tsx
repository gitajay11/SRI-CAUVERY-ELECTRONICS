import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Primitives';
import { CheckIcon, InfoIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'Order',
  path: '/order',
  noIndex: true,
});

/**
 * Order confirmation and detail.
 *
 * Signed-in shoppers are matched on their user id. A guest who has just
 * checked out arrives with `?email=` and is matched on the email stored on the
 * order — enough to see their own confirmation, not enough to browse someone
 * else's order by guessing an order number.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string; payment?: string; email?: string; verify?: string }>;
}) {
  const { orderNumber } = await params;
  const { placed, payment, email, verify } = await searchParams;
  const { t } = await getI18n();

  const user = await getSessionUser();
  const repo = getRepository();

  const order = user
    ? ((await repo.getOrderForUser(user.id, orderNumber)) ??
      (email ? await repo.getOrderByNumberAndEmail(orderNumber, email) : null))
    : email
      ? await repo.getOrderByNumberAndEmail(orderNumber, email)
      : null;

  if (!order) notFound();

  // "Confirmed" is a fact about the order, not about the URL. Anyone can
  // add ?placed=1; only the database knows whether the money was verified.
  // A cash order is confirmed the moment it exists; an online one only once
  // the server has checked the gateway's signature and marked it PAID.
  const settled = order.paymentMethod === 'COD' || order.paymentStatus === 'PAID';
  const justPlaced = placed === '1' && settled;
  // Arrived from checkout with money possibly taken but not yet verified —
  // the one state that must never read as either "paid" or "failed".
  const verificationFailed = verify === 'failed' && !settled;
  const awaitingPayment =
    !verificationFailed && (payment === 'pending' || (placed === '1' && !settled));

  // Returns are only offered to a signed-in owner: a guest link is enough to
  // see a confirmation, not enough to start a return on someone's behalf.
  const returns = user ? await repo.returnEligibility(user.id, orderNumber) : null;

  return (
    <div className="container-page py-6 lg:py-10">
      {justPlaced ? (
        <section className="mb-6 overflow-hidden rounded-card border border-success-500/25 bg-success-50 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-action text-2xl text-on-action">
              <CheckIcon />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-ink-900 sm:text-2xl">
                {t('order.confirmed.title')}
              </h1>
              <p className="mt-1.5 text-sm text-ink-600 sm:text-base">
                {t('order.confirmed.body', { email: order.customerEmail })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <ButtonLink href="/orders" variant="secondary" size="sm">
                  {t('order.myOrders')}
                </ButtonLink>
                <ButtonLink href="/shop" variant="ghost" size="sm">
                  {t('order.continueShopping')} →
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
            {t('order.viewOrder')}
          </h1>
          <Link
            href="/orders"
            className="text-sm font-semibold text-link hover:underline"
          >
            ← {t('order.myOrders')}
          </Link>
        </header>
      )}

      {verificationFailed ? (
        <Alert tone="warning" icon={<InfoIcon />} className="mb-6">
          {t('order.verifyFailed')}
        </Alert>
      ) : null}

      {awaitingPayment ? (
        <Alert tone="warning" icon={<InfoIcon />} className="mb-6">
          {t('order.awaitingPayment')}
        </Alert>
      ) : null}

      <OrderDetail order={order} showCancel={Boolean(user)} returns={returns ?? undefined} />
    </div>
  );
}
