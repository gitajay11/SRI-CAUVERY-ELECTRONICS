import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { OrderStatus } from '@tamizh/core/types';
import { getI18n } from '@/i18n/server';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { Badge, EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { statusTone } from '@/components/orders/OrderDetail';
import { ClipboardIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'My orders',
  path: '/orders',
  noIndex: true,
});

export default async function OrdersPage() {
  const { t, locale } = await getI18n();
  const user = await getSessionUser();
  if (!user) redirect('/signin?next=/orders');

  const orders = await getRepository().listOrdersForUser(user.id);

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('account.title'), path: '/account' },
          { name: t('order.myOrders'), path: '/orders' },
        ]}
      />

      <h1 className="mb-6 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {t('order.myOrders')}
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardIcon />}
          title={t('order.empty.title')}
          body={t('order.empty.body')}
          action={<ButtonLink href="/shop">{t('cart.empty.cta')}</ButtonLink>}
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="overflow-hidden rounded-card border border-ink-100 bg-surface"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-ink-900">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-ink-500">{formatDate(order.placedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(order.status)}>
                    {t(`order.status.${order.status}` as `order.status.${OrderStatus}`)}
                  </Badge>
                  <span className="text-base font-extrabold tabular-nums text-ink-900">
                    {formatINR(order.total)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4">
                <ul className="flex -space-x-3">
                  {order.items.slice(0, 4).map((item) => (
                    <li
                      key={item.id}
                      className="relative size-14 overflow-hidden rounded-xl border-2 border-surface bg-ink-50"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                    </li>
                  ))}
                  {order.items.length > 4 ? (
                    <li className="grid size-14 place-items-center rounded-xl border-2 border-surface bg-ink-100 text-xs font-bold text-ink-600">
                      +{order.items.length - 4}
                    </li>
                  ) : null}
                </ul>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-ink-800">
                    {order.items
                      .map((item) =>
                        locale === 'ta' && item.nameTa ? item.nameTa : item.name,
                      )
                      .join(', ')}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {order.items.length === 1
                      ? t('cart.itemCount', { count: order.items.length })
                      : t('cart.itemCountPlural', { count: order.items.length })}
                  </p>
                </div>

                <Link
                  href={`/order/${order.orderNumber}`}
                  className="shrink-0 rounded-full border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {t('order.viewOrder')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
