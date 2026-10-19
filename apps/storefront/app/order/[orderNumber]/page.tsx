import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { ButtonLink } from '@/components/ui/Button';
import { formatINR } from '@tamizh/core/money';

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
  searchParams: Promise<{ placed?: string; email?: string }>;
}) {
  const { orderNumber } = await params;
  const { placed, email } = await searchParams;
  const { t, locale } = await getI18n();

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
  // A cash order is confirmed the moment it exists; an older online one only
  // once it was marked PAID.
  const settled = order.paymentMethod === 'COD' || order.paymentStatus === 'PAID';
  const justPlaced = placed === '1' && settled;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Returns are only offered to a signed-in owner: a guest link is enough to
  // see a confirmation, not enough to start a return on someone's behalf.
  const returns = user ? await repo.returnEligibility(user.id, orderNumber) : null;

  return (
    <div className="container-page py-6 lg:py-10">
      {justPlaced ? (
        <section
          aria-labelledby="order-placed-title"
          className="mb-6 overflow-hidden rounded-card border border-success-500/25 bg-success-50 p-5 [-webkit-tap-highlight-color:transparent] sm:p-7"
        >
          <div className="flex flex-col items-center text-center">
            <PlacedCheck />
            <h1 id="order-placed-title" className="mt-4 text-xl font-extrabold text-ink-900 sm:text-2xl">
              {t('order.confirmed.title')}
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-ink-600 sm:text-base">
              {t('order.confirmed.body', { email: order.customerEmail })}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t('order.success.orderId')}
            </p>
            <p className="font-mono text-lg font-bold text-ink-900">{order.orderNumber}</p>
          </div>

          <div className="mx-auto mt-5 grid max-w-2xl gap-3 text-left text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-ink-100 bg-surface p-4">
              <p className="font-bold text-ink-900">
                {t('order.items')}{' '}
                <span className="font-normal text-ink-500">
                  · {t('order.success.itemCount', { count: itemCount })}
                </span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="min-w-0 text-ink-700">
                      <span className="line-clamp-1">
                        {locale === 'ta' && item.nameTa ? item.nameTa : item.name}
                      </span>
                      <span className="text-xs text-ink-400">× {item.quantity}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                      {formatINR(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-ink-100 pt-3 text-base font-extrabold text-ink-900">
                {order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID'
                  ? t('order.success.payOnDelivery', { amount: formatINR(order.total) })
                  : formatINR(order.total)}
              </p>
            </div>

            <div className="rounded-xl border border-ink-100 bg-surface p-4">
              <p className="font-bold text-ink-900">{t('order.deliverTo')}</p>
              <p className="mt-2 font-semibold text-ink-800">
                {order.customerName} · {order.customerPhone}
              </p>
              <p className="mt-0.5 leading-relaxed text-ink-600">
                {[
                  order.addressLine1,
                  order.addressLine2,
                  order.city,
                  order.district,
                  `${order.state} ${order.pincode}`,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
            <ButtonLink href="#order-tracking" variant="primary">
              {t('order.success.track')}
            </ButtonLink>
            <ButtonLink href="/shop" variant="outline">
              {t('order.continueShopping')}
            </ButtonLink>
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

      <OrderDetail order={order} showCancel={Boolean(user)} returns={returns ?? undefined} />
    </div>
  );
}

/**
 * The order-placed tick: the circle springs in, then the check draws itself.
 * Under reduced motion both simply appear, by the global rule.
 */
function PlacedCheck() {
  return (
    <span className="grid size-16 place-items-center rounded-full bg-action text-on-action shadow-md animate-check-pop">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" aria-hidden="true">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-check-draw"
        />
      </svg>
    </span>
  );
}
