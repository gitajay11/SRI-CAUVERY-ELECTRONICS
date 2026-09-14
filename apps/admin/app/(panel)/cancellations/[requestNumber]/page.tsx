import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getCancellation } from '@/services/cancellations';
import {
  PageHeader,
  Panel,
  Badge,
  DescriptionList,
  DescriptionRow,
} from '@/components/ui/Primitives';
import {
  CancellationStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  RefundStatusBadge,
} from '@/components/orders/OrderBadges';
import { CancellationDecision } from '@/components/cancellations/CancellationDecision';

export const metadata = { title: 'Cancel request' };

export default async function CancellationDetailPage({
  params,
}: {
  params: Promise<{ requestNumber: string }>;
}) {
  const identity = await requirePermission('orders.view');
  const { t, locale } = await getI18n();
  const { requestNumber } = await params;

  const request = await getCancellation(decodeURIComponent(requestNumber));
  if (!request) notFound();

  const canDecide = identity.permissions.has('orders.cancel');
  const pending = request.status === 'PENDING';

  return (
    <>
      <PageHeader
        title={request.requestNumber}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/orders/${request.order.orderNumber}`}
              className="font-mono hover:text-link hover:underline"
            >
              {request.order.orderNumber}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{request.order.customerName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t('cancellations.requested')} {formatDate(request.requestedAt, true)}
            </span>
          </span>
        }
        breadcrumb={
          <Link href="/cancellations" className="text-sm text-slate-500 hover:text-link">
            ← {t('cancellations.title')}
          </Link>
        }
        action={<CancellationStatusBadge status={request.status} locale={locale} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Panel title={t('cancellations.reason')}>
            <p className="text-sm text-slate-700">{request.reason}</p>
            {request.decisionNote ? (
              <p className="mt-3 border-s-[3px] border-action-edge/60 bg-success-50/60 px-3 py-2 text-sm text-slate-700">
                <span className="block text-xs font-semibold text-link">
                  {t('cancellations.note')}
                  {request.handledBy ? ` · ${request.handledBy.name}` : ''}
                </span>
                {request.decisionNote}
              </p>
            ) : null}
          </Panel>

          <Panel title={t('cancellations.items')} padded={false}>
            <ul className="divide-y divide-slate-100">
              {request.order.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{item.name}</span>
                    <span className="block font-mono text-xs text-slate-500">{item.sku}</span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="block tabular-nums text-slate-500">
                      {item.quantity} × {formatINR(item.unitPrice)}
                    </span>
                    <span className="block font-semibold tabular-nums text-slate-900">
                      {formatINR(item.unitPrice * item.quantity)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{t('common.total')}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatINR(request.order.total)}
              </span>
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20">
          <Panel title={t('cancellations.decision')}>
            {pending ? (
              canDecide ? (
                <CancellationDecision
                  requestNumber={request.requestNumber}
                  canApprove={request.orderStillCancellable}
                />
              ) : (
                <p className="text-sm text-slate-500">{t('auth.forbidden')}</p>
              )
            ) : (
              <DescriptionList>
                <DescriptionRow label={t('cancellations.decided')}>
                  {request.handledAt ? formatDate(request.handledAt, true) : '—'}
                </DescriptionRow>
                <DescriptionRow label={t('cancellations.decidedBy')}>
                  {request.handledBy?.name ?? '—'}
                </DescriptionRow>
                {request.refund ? (
                  <DescriptionRow label={t('cancellations.refundRaised')}>
                    <span className="inline-flex items-center gap-2">
                      {formatINR(request.refund.amount)}
                      <RefundStatusBadge status={request.refund.status} locale={locale} />
                    </span>
                  </DescriptionRow>
                ) : null}
              </DescriptionList>
            )}
          </Panel>

          <Panel title={t('orders.orderNumber')}>
            <DescriptionList>
              <DescriptionRow label={t('common.status')}>
                <OrderStatusBadge status={request.order.status} locale={locale} />
              </DescriptionRow>
              <DescriptionRow label={t('payments.method')}>
                <span className="inline-flex items-center gap-2">
                  {request.order.paymentMethod}
                  <PaymentStatusBadge status={request.order.paymentStatus} locale={locale} />
                </span>
              </DescriptionRow>
              <DescriptionRow label={t('cancellations.orderPlaced')}>
                {formatDate(request.order.placedAt, true)}
              </DescriptionRow>
              <DescriptionRow label={t('common.total')}>
                {formatINR(request.order.total)}
              </DescriptionRow>
            </DescriptionList>
          </Panel>

          <Panel title={t('cancellations.customer')}>
            <DescriptionList>
              <DescriptionRow label={t('common.name')}>{request.order.customerName}</DescriptionRow>
              <DescriptionRow label={t('common.phone')}>
                <a href={`tel:${request.order.customerPhone}`} className="hover:text-link">
                  {request.order.customerPhone}
                </a>
              </DescriptionRow>
              <DescriptionRow label={t('common.email')}>
                <span className="break-all">{request.order.customerEmail}</span>
              </DescriptionRow>
              {request.user ? (
                <DescriptionRow label={t('cancellations.customer')}>
                  <Link href={`/customers/${request.user.id}`} className="hover:text-link hover:underline">
                    <Badge tone="neutral">{request.user.name}</Badge>
                  </Link>
                </DescriptionRow>
              ) : null}
            </DescriptionList>
          </Panel>
        </div>
      </div>
    </>
  );
}
