import Image from 'next/image';
import Link from 'next/link';
import type { OrderStatus, OrderView, PaymentStatus } from '@tamizh/core/types';
import { cn, formatDate } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { getI18n } from '@/i18n/server';
import { Badge } from '@/components/ui/Primitives';
import { CancelOrderButton } from './CancelOrderButton';
import { RequestReturnForm, type ReturnableItem } from './RequestReturnForm';
import { shopConfig, whatsappLink } from '@/lib/site';
import { PackageIcon, PhoneIcon, WhatsAppIcon } from '@/components/ui/Icons';

/** Colour mapping for order and payment states. */
export function statusTone(status: OrderStatus) {
  switch (status) {
    case 'DELIVERED':
      return 'success' as const;
    case 'CANCELLED':
    case 'RETURNED':
      return 'danger' as const;
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 'brand' as const;
    case 'REFUNDED':
      return 'neutral' as const;
    default:
      return 'warning' as const;
  }
}

export function paymentTone(status: PaymentStatus) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'FAILED') return 'danger' as const;
  if (status === 'REFUNDED') return 'neutral' as const;
  return 'warning' as const;
}

/** The fulfilment steps a normal order passes through, for the tracker. */
const TRACK_STEPS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export async function OrderDetail({
  order,
  showCancel = false,
  returns,
}: {
  order: OrderView;
  showCancel?: boolean;
  /**
   * Return eligibility, worked out on the server. Absent when the order is not
   * eligible at all — the customer is not shown a form that would be refused.
   */
  returns?: {
    windowDays: number;
    pending: boolean;
    returnable: ReturnableItem[];
  };
}) {
  const { t, locale } = await getI18n();
  const cancelled = order.status === 'CANCELLED';
  const currentStep = TRACK_STEPS.indexOf(order.status);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t('order.number')}
            </p>
            <p className="font-mono text-lg font-bold text-ink-900">{order.orderNumber}</p>
            <p className="mt-1 text-sm text-ink-500">
              {t('order.date')}: {formatDate(order.placedAt, true)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(order.status)}>
              {t(`order.status.${order.status}` as `order.status.${OrderStatus}`)}
            </Badge>
            <Badge tone={paymentTone(order.paymentStatus)}>
              {t(`order.payment.${order.paymentStatus}` as `order.payment.${PaymentStatus}`)}
            </Badge>
          </div>
        </div>

        {cancelled ? (
          <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger-600">
            {t('order.cancelled')}
            {order.cancelReason ? ` — ${order.cancelReason}` : ''}
          </p>
        ) : (
          <ol className="mt-5 grid gap-3 sm:grid-cols-6">
            {TRACK_STEPS.map((step, index) => {
              const done = currentStep >= index;
              return (
                <li key={step} className="flex items-center gap-2 sm:block">
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold sm:mb-2',
                      done ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      'block text-xs leading-tight',
                      done ? 'font-semibold text-ink-800' : 'text-ink-400',
                    )}
                  >
                    {t(`order.status.${step}` as `order.status.${OrderStatus}`)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-2 hidden h-0.5 w-full rounded-full sm:block',
                      done ? 'bg-brand-500' : 'bg-ink-100',
                    )}
                  />
                </li>
              );
            })}
          </ol>
        )}

        {order.trackingNumber ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2.5 text-sm text-link">
            <PackageIcon className="shrink-0 text-base" />
            {t('order.trackingNumber')}:{' '}
            <span className="font-mono font-bold">{order.trackingNumber}</span>
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* Items */}
        <section className="rounded-card border border-ink-100 bg-surface">
          <h2 className="border-b border-ink-100 px-4 py-3 text-base font-bold text-ink-900 sm:px-5">
            {t('order.items')}
          </h2>
          <ul className="divide-y divide-ink-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 p-4 sm:gap-4 sm:px-5">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink-900">
                    {item.slug ? (
                      <Link href={`/product/${item.slug}`} className="hover:text-link">
                        {locale === 'ta' && item.nameTa ? item.nameTa : item.name}
                      </Link>
                    ) : (
                      (locale === 'ta' && item.nameTa ? item.nameTa : item.name)
                    )}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-ink-400">{item.sku}</p>
                  <p className="mt-1 text-sm text-ink-600">
                    {formatINR(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-ink-900">
                  {formatINR(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-ink-100 px-4 py-4 text-sm sm:px-5">
            <div className="flex justify-between">
              <dt className="text-ink-600">{t('cart.subtotal')}</dt>
              <dd className="font-semibold tabular-nums">{formatINR(order.subtotal)}</dd>
            </div>
            {order.discountTotal > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-600">
                  {order.couponCode
                    ? t('cart.couponDiscount', { code: order.couponCode })
                    : t('cart.productDiscount')}
                </dt>
                <dd className="font-semibold tabular-nums text-success-500">
                  -{formatINR(order.discountTotal)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-ink-600">{t('cart.shipping')}</dt>
              <dd className="font-semibold tabular-nums">
                {order.shippingFee === 0 ? t('cart.shippingFree') : formatINR(order.shippingFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2.5">
              <dt className="text-base font-bold">{t('cart.total')}</dt>
              <dd className="text-lg font-extrabold tabular-nums">
                {formatINR(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Delivery + support */}
        <div className="space-y-4">
          <section className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
            <h2 className="text-base font-bold text-ink-900">{t('order.deliverTo')}</h2>
            <address className="mt-2.5 text-sm not-italic leading-relaxed text-ink-600">
              <span className="block font-semibold text-ink-900">{order.customerName}</span>
              {order.addressLine1}
              {order.addressLine2 ? `, ${order.addressLine2}` : ''}
              <br />
              {order.city}, {order.district}
              <br />
              {order.state} — {order.pincode}
              <br />
              <span className="mt-1.5 block">{order.customerPhone}</span>
              <span className="block break-all">{order.customerEmail}</span>
            </address>

            <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">{t('order.paymentMethod')}</dt>
                <dd className="text-right font-semibold text-ink-800">
                  {t(`order.method.${order.paymentMethod}` as 'order.method.COD')}
                </dd>
              </div>
            </dl>

            {order.notes ? (
              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                {order.notes}
              </p>
            ) : null}
          </section>

          {showCancel && !cancelled ? (
            <CancelOrderButton
              orderNumber={order.orderNumber}
              status={order.status}
            />
          ) : null}

          {showCancel && returns ? (
            returns.pending ? (
              <p className="rounded-card border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-600">
                {t('order.returnPending')}
              </p>
            ) : (
              <RequestReturnForm
                orderNumber={order.orderNumber}
                windowDays={returns.windowDays}
                items={returns.returnable}
              />
            )
          ) : null}

          <section className="rounded-card border border-ink-100 bg-success-50/60 p-4 sm:p-5">
            <h2 className="text-sm font-bold text-ink-800">{t('order.needHelp')}</h2>
            <div className="mt-3 space-y-2">
              <a
                href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-sm font-semibold text-link hover:underline"
              >
                <PhoneIcon className="text-base" />
                {shopConfig.supportPhone}
              </a>
              <a
                href={whatsappLink(`Hello, I need help with order ${order.orderNumber}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-link hover:underline"
              >
                <WhatsAppIcon className="text-base" />
                {t('contact.whatsapp')}
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
