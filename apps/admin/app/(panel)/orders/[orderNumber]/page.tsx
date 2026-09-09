import Link from 'next/link';
import { notFound as nextNotFound } from 'next/navigation';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { FULFILMENT_STEPS, STATUS_FLOW } from '@tamizh/core/pricing';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getOrderDetail, type OrderDetail } from '@/services/orders';
import { storefrontUrl } from '@/lib/env';
import {
  Badge,
  DescriptionList,
  DescriptionRow,
  PageHeader,
  Panel,
} from '@/components/ui/Primitives';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ReturnStatusBadge,
} from '@/components/orders/OrderBadges';
import { OrderStatusForm } from '@/components/orders/OrderStatusForm';
import { OrderNotes } from '@/components/orders/OrderNotes';
import { cn } from '@tamizh/core/utils';
import { ChevronLeftIcon, PrinterIcon } from '@/components/ui/Icons';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const identity = await requirePermission('orders.view');
  const { orderNumber } = await params;
  const { t, locale, dict } = await getI18n();

  const order = await getOrderDetail(orderNumber);
  if (!order) nextNotFound();

  const canUpdate = identity.permissions.has('orders.update_status');
  const canNote = identity.permissions.has('orders.note');
  const nextStatuses = STATUS_FLOW[order.status] ?? [];

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            <ChevronLeftIcon className="text-sm" />
            {t('orders.title')}
          </Link>
        }
        title={<span className="font-mono">{order.orderNumber}</span>}
        description={formatDate(order.placedAt.toISOString(), true)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} locale={locale} />
            <PaymentStatusBadge status={order.paymentStatus} locale={locale} />
            <Link
              href={`/orders/${order.orderNumber}/invoice`}
              className="no-print inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-surface px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              <PrinterIcon className="text-base" />
              {t('orders.printInvoice')}
            </Link>
          </div>
        }
      />

      {order.status === 'CANCELLED' && order.cancelReason ? (
        <p className="mb-4 rounded-lg border border-critical-100 bg-critical-50 px-3.5 py-2.5 text-sm font-medium text-critical-600">
          {order.cancelReason}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Timeline order={order} dict={dict} label={t('orders.timeline')} />

          {/* Items */}
          <Panel title={t('orders.items')} padded={false}>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      {t('common.name')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                      {t('common.price')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">
                      {t('common.quantity')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                      {t('common.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        {item.product?.slug ? (
                          <a
                            href={`${storefrontUrl()}/product/${item.product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <span className="font-medium text-slate-900">{item.name}</span>
                        )}
                        <span className="block font-mono text-xs text-slate-500">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatINR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <DescriptionList>
                <DescriptionRow label={t('orders.subtotal')}>
                  {formatINR(order.subtotal)}
                </DescriptionRow>
                {order.discountTotal > 0 ? (
                  <DescriptionRow
                    label={
                      order.couponCode
                        ? `${t('orders.discount')} (${order.couponCode})`
                        : t('orders.discount')
                    }
                  >
                    <span className="text-positive-600">
                      −{formatINR(order.discountTotal)}
                    </span>
                  </DescriptionRow>
                ) : null}
                {order.taxTotal > 0 ? (
                  <DescriptionRow label={t('orders.tax')}>
                    {formatINR(order.taxTotal)}
                  </DescriptionRow>
                ) : null}
                <DescriptionRow label={t('orders.delivery')}>
                  {order.shippingFee === 0 ? '—' : formatINR(order.shippingFee)}
                </DescriptionRow>
                <DescriptionRow label={<strong>{t('orders.grandTotal')}</strong>}>
                  <strong className="text-base">{formatINR(order.total)}</strong>
                </DescriptionRow>
                {order.refundedTotal > 0 ? (
                  <DescriptionRow label={t('refunds.title')}>
                    <span className="text-critical-600">
                      −{formatINR(order.refundedTotal)}
                    </span>
                  </DescriptionRow>
                ) : null}
              </DescriptionList>
            </div>

            {/* Margin is commercially sensitive — only for those who may see
                cost prices at all. */}
            {identity.permissions.has('reports.view') && order.margin.cost > 0 ? (
              <div className="border-t border-slate-100 bg-slate-25 px-4 py-2.5 text-xs text-slate-500">
                {t('orders.margin')}:{' '}
                <span className="font-semibold text-slate-700">
                  {formatINR(order.margin.profit)}
                </span>{' '}
                ({Math.round((order.margin.profit / Math.max(1, order.margin.revenue)) * 100)}%)
              </div>
            ) : null}
          </Panel>

          {canNote ? (
            <OrderNotes
              orderNumber={order.orderNumber}
              notes={order.internalNotes.map((note) => ({
                id: note.id,
                body: note.body,
                author: note.author?.name ?? t('inventory.system'),
                createdAt: note.createdAt.toISOString(),
              }))}
            />
          ) : null}

          {order.returnRequests.length > 0 ? (
            <Panel title={t('returns.title')} padded={false}>
              <ul className="divide-y divide-slate-100">
                {order.returnRequests.map((request) => (
                  <li key={request.id} className="px-4 py-3">
                    <Link
                      href={`/returns/${request.returnNumber}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>
                        <span className="block font-mono text-sm font-semibold text-slate-900">
                          {request.returnNumber}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {request.reason}
                        </span>
                      </span>
                      <ReturnStatusBadge status={request.status} locale={locale} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-20">
          {canUpdate ? (
            <OrderStatusForm
              orderNumber={order.orderNumber}
              status={order.status}
              nextStatuses={nextStatuses}
              trackingNumber={order.trackingNumber}
              courier={order.courier}
            />
          ) : null}

          <Panel title={t('orders.customer')}>
            <DescriptionList>
              <DescriptionRow label={t('common.name')}>
                {order.user ? (
                  <Link
                    href={`/customers/${order.user.id}`}
                    className="text-brand-700 hover:underline"
                  >
                    {order.customerName}
                  </Link>
                ) : (
                  order.customerName
                )}
              </DescriptionRow>
              <DescriptionRow label={t('common.phone')}>
                <a href={`tel:${order.customerPhone}`} className="text-brand-700">
                  {order.customerPhone}
                </a>
              </DescriptionRow>
              <DescriptionRow label={t('common.email')}>
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="break-all text-brand-700"
                >
                  {order.customerEmail}
                </a>
              </DescriptionRow>
            </DescriptionList>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-1 text-sm text-slate-500">{t('orders.shipping')}</p>
              <address className="text-sm not-italic leading-relaxed text-slate-800">
                {order.addressLine1}
                {order.addressLine2 ? `, ${order.addressLine2}` : ''}
                <br />
                {order.city}, {order.district}
                <br />
                {order.state} — {order.pincode}
              </address>
            </div>

            {order.notes ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {order.notes}
              </p>
            ) : null}
          </Panel>

          <Panel title={t('orders.payment')}>
            <DescriptionList>
              <DescriptionRow label={t('payments.method')}>
                {dict[`method.${order.paymentMethod}` as 'method.COD']}
              </DescriptionRow>
              <DescriptionRow label={t('common.status')}>
                <PaymentStatusBadge status={order.paymentStatus} locale={locale} />
              </DescriptionRow>
              {order.payments.map((payment) => (
                <DescriptionRow key={payment.id} label={payment.provider} mono>
                  {payment.providerPaymentId ?? payment.providerOrderId ?? '—'}
                </DescriptionRow>
              ))}
            </DescriptionList>
          </Panel>
        </div>
      </div>
    </>
  );
}

/**
 * The fulfilment timeline.
 *
 * Shows the happy path as steps with the recorded events underneath, so staff
 * can see both where the order is and exactly who moved it there and when.
 */
function Timeline({
  order,
  dict,
  label,
}: {
  order: OrderDetail;
  dict: Record<string, string>;
  label: string;
}) {
  const currentIndex = FULFILMENT_STEPS.indexOf(order.status);
  const derailed = currentIndex === -1;

  return (
    <Panel title={label}>
      {!derailed ? (
        <ol className="mb-4 grid gap-2 sm:grid-cols-7">
          {FULFILMENT_STEPS.map((step, index) => {
            const done = currentIndex >= index;
            return (
              <li key={step} className="flex items-center gap-2 sm:block">
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold sm:mb-1.5',
                    done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400',
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'block text-xs leading-tight',
                    done ? 'font-semibold text-slate-800' : 'text-slate-400',
                  )}
                >
                  {dict[`status.${step}`]}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1.5 hidden h-0.5 w-full rounded-full sm:block',
                    done ? 'bg-brand-500' : 'bg-slate-100',
                  )}
                />
              </li>
            );
          })}
        </ol>
      ) : null}

      {order.events.length > 0 ? (
        <ol className="space-y-2.5 border-t border-slate-100 pt-3">
          {order.events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-slate-300" />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-slate-800">
                  {dict[`status.${event.status}`]}
                </span>
                {event.message ? (
                  <span className="block text-slate-600">{event.message}</span>
                ) : null}
                <span className="block text-xs text-slate-400">
                  {formatDate(event.createdAt.toISOString(), true)}
                  {event.actor ? ` · ${event.actor.name}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-slate-100 pt-3 text-sm text-slate-400">
          <Badge tone="neutral">{dict[`status.${order.status}`]}</Badge>
        </p>
      )}
    </Panel>
  );
}
