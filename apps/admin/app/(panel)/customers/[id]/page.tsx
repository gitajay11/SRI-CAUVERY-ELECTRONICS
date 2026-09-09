import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getCustomer } from '@/services/customers';
import {
  PageHeader,
  Panel,
  Badge,
  StatCard,
  EmptyState,
  DescriptionList,
  DescriptionRow,
} from '@/components/ui/Primitives';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/OrderBadges';
import { BlockCustomerButton } from '@/components/customers/BlockCustomerButton';
import { MapPinIcon, ReceiptIcon, StarIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Customer' };

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await requirePermission('customers.view');
  const { t, locale, dict } = await getI18n();
  const { id } = await params;

  const customer = await getCustomer(id);
  if (!customer) notFound();

  const canManage = identity.permissions.has('customers.manage');
  const canSeeOrders = identity.permissions.has('orders.view');

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={`mailto:${customer.email}`} className="hover:text-brand-700">
              {customer.email}
            </a>
            {customer.phone ? (
              <>
                <span aria-hidden="true">·</span>
                <a href={`tel:${customer.phone}`} className="tabular-nums hover:text-brand-700">
                  {customer.phone}
                </a>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>
              {t('customers.joined')} {formatDate(customer.createdAt)}
            </span>
          </span>
        }
        breadcrumb={
          <Link href="/customers" className="text-sm text-slate-500 hover:text-brand-700">
            ← {t('customers.title')}
          </Link>
        }
        action={
          customer.blocked ? (
            <Badge tone="critical">{t('customers.blocked')}</Badge>
          ) : (
            <Badge tone="positive">{t('customers.active')}</Badge>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('customers.orderCount')} value={customer.stats.orderCount} />
        <StatCard
          label={t('customers.lifetimeValue')}
          value={formatINR(customer.stats.lifetimeValue)}
          tone="brand"
        />
        <StatCard
          label={t('customers.averageOrder')}
          value={formatINR(customer.stats.averageOrder)}
        />
        <StatCard label={t('customers.wishlistItems')} value={customer.stats.wishlistCount} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          {canSeeOrders ? (
            <Panel title={t('customers.orderHistory')} padded={false}>
              {customer.orders.length === 0 ? (
                <EmptyState icon={<ReceiptIcon />} title={t('customers.noOrders')} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {customer.orders.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50"
                      >
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {order.orderNumber}
                        </span>
                        <OrderStatusBadge status={order.status} locale={locale} />
                        <PaymentStatusBadge status={order.paymentStatus} locale={locale} />
                        <span className="ms-auto flex items-center gap-4">
                          <span className="text-xs text-slate-400">
                            {formatDate(order.placedAt)}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatINR(order.total)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}

          <Panel title={t('customers.reviews')} padded={false}>
            {customer.reviews.length === 0 ? (
              <EmptyState icon={<StarIcon />} title={t('customers.noReviews')} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {customer.reviews.map((review) => (
                  <li key={review.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-sm font-semibold text-gold-700"
                        aria-label={`${review.rating} out of 5`}
                      >
                        {'★'.repeat(review.rating)}
                        <span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span>
                      </span>
                      <Link
                        href={`/products/${review.product.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {review.product.name}
                      </Link>
                      <Badge tone={review.status === 'APPROVED' ? 'positive' : 'caution'}>
                        {dict[`reviews.status.${review.status}` as 'reviews.status.APPROVED']}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDate(review.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={t('customers.addresses')}>
            {customer.addresses.length === 0 ? (
              <EmptyState icon={<MapPinIcon />} title={t('customers.noAddresses')} />
            ) : (
              <ul className="space-y-3">
                {customer.addresses.map((address) => (
                  <li
                    key={address.id}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      {address.fullName}
                      {address.isDefault ? <Badge tone="brand">{t('customers.defaultAddress')}</Badge> : null}
                    </p>
                    <p className="text-slate-600">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}
                      <br />
                      {address.city}, {address.district}, {address.state} {address.pincode}
                    </p>
                    <p className="mt-0.5 tabular-nums text-slate-500">{address.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('common.status')}>
            <DescriptionList>
              <DescriptionRow label={t('customers.joined')}>
                {formatDate(customer.createdAt)}
              </DescriptionRow>
              <DescriptionRow label={t('common.status')}>
                {customer.blocked ? t('customers.blocked') : t('customers.active')}
              </DescriptionRow>
              {customer.blockedAt ? (
                <DescriptionRow label={t('customers.blocked')}>
                  {formatDate(customer.blockedAt, true)}
                </DescriptionRow>
              ) : null}
            </DescriptionList>

            {canManage ? (
              <div className="mt-4">
                <BlockCustomerButton
                  id={customer.id}
                  name={customer.name}
                  blocked={customer.blocked}
                />
              </div>
            ) : null}
          </Panel>

          <p className="text-xs text-slate-400">{t('customers.privacyNote')}</p>
        </div>
      </div>
    </>
  );
}
