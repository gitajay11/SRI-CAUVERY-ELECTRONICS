import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getReturn, RETURN_FLOW, refundableAmount } from '@/services/money';
import {
  PageHeader,
  Panel,
  Badge,
  DescriptionList,
  DescriptionRow,
  EmptyState,
} from '@/components/ui/Primitives';
import { ReturnStatusBadge, RefundStatusBadge } from '@/components/orders/OrderBadges';
import { ReturnDecision } from '@/components/returns/ReturnDecision';
import { RaiseRefund } from '@/components/refunds/RaiseRefund';
import { ReceiptIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Return' };

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ returnNumber: string }>;
}) {
  const identity = await requirePermission('returns.view');
  const { t, locale } = await getI18n();
  const { returnNumber } = await params;

  const request = await getReturn(decodeURIComponent(returnNumber));
  if (!request) notFound();

  const canManage = identity.permissions.has('returns.manage');
  const canRefund = identity.permissions.has('refunds.view');
  const refundable = canRefund ? await refundableAmount(request.order.id) : null;

  return (
    <>
      <PageHeader
        title={request.returnNumber}
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
              {t('returns.requested')} {formatDate(request.requestedAt, true)}
            </span>
          </span>
        }
        breadcrumb={
          <Link href="/returns" className="text-sm text-slate-500 hover:text-link">
            ← {t('returns.title')}
          </Link>
        }
        action={<ReturnStatusBadge status={request.status} locale={locale} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Panel title={t('returns.reason')}>
            <p className="text-sm text-slate-700">{request.reason}</p>
            {request.customerComment ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {request.customerComment}
              </p>
            ) : null}
            {request.decisionNote ? (
              <p className="mt-3 border-s-[3px] border-action-edge/60 bg-success-50/60 px-3 py-2 text-sm text-slate-700">
                <span className="block text-xs font-semibold text-link">
                  {t('returns.decisionNote')}
                  {request.handledBy ? ` · ${request.handledBy.name}` : ''}
                </span>
                {request.decisionNote}
              </p>
            ) : null}
          </Panel>

          <Panel title={t('returns.items')} padded={false}>
            <ul className="divide-y divide-slate-100">
              {request.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">
                      {item.orderItem.name}
                    </span>
                    <span className="block font-mono text-xs text-slate-500">
                      {item.orderItem.sku}
                    </span>
                    {item.outcome ? (
                      <span className="mt-1 inline-block">
                        <Badge tone={item.outcome === 'RESTOCK' ? 'positive' : 'caution'}>
                          {item.outcome === 'RESTOCK'
                            ? t('returns.restock')
                            : t('returns.damaged')}
                        </Badge>
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right text-sm">
                    <span className="block tabular-nums text-slate-500">
                      {item.quantity} × {formatINR(item.orderItem.unitPrice)}
                    </span>
                    <span className="block font-semibold tabular-nums text-slate-900">
                      {formatINR(item.orderItem.unitPrice * item.quantity)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">
                {t('returns.refundValue')}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatINR(request.refundableValue)}
              </span>
            </div>
          </Panel>

          <Panel title={t('returns.refundsOnReturn')} padded={false}>
            {request.refunds.length === 0 ? (
              <EmptyState icon={<ReceiptIcon />} title={t('refunds.empty')} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {request.refunds.map((refund) => (
                  <li key={refund.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatINR(refund.amount)}
                    </span>
                    <RefundStatusBadge status={refund.status} locale={locale} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                      {refund.reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(refund.processedAt ?? refund.requestedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20">
          <Panel title={t('returns.nextStep')}>
            {canManage ? (
              <ReturnDecision
                returnNumber={request.returnNumber}
                current={request.status}
                next={RETURN_FLOW[request.status]}
                lines={request.items.map((item) => ({
                  id: item.id,
                  name: item.orderItem.name,
                  sku: item.orderItem.sku,
                  quantity: item.quantity,
                  unitPrice: item.orderItem.unitPrice,
                  outcome: item.outcome,
                }))}
              />
            ) : (
              <p className="text-sm text-slate-500">{t('auth.forbidden')}</p>
            )}
          </Panel>

          {canRefund && refundable ? (
            <Panel title={t('returns.raiseRefund')}>
              <RaiseRefund
                orderId={request.order.id}
                returnRequestId={request.id}
                available={refundable.available}
                suggested={Math.min(request.refundableValue, refundable.available)}
              />
            </Panel>
          ) : null}

          <Panel title={t('orders.orderNumber')}>
            <DescriptionList>
              <DescriptionRow label={t('common.total')}>
                {formatINR(request.order.total)}
              </DescriptionRow>
              <DescriptionRow label={t('payments.method')}>
                {request.order.paymentMethod}
              </DescriptionRow>
              {request.order.deliveredAt ? (
                <DescriptionRow label={t('status.DELIVERED')}>
                  {formatDate(request.order.deliveredAt)}
                </DescriptionRow>
              ) : null}
              {request.pickupScheduledAt ? (
                <DescriptionRow label={t('returns.pickupDate')}>
                  {formatDate(request.pickupScheduledAt)}
                </DescriptionRow>
              ) : null}
              {request.receivedAt ? (
                <DescriptionRow label={t('return.RECEIVED')}>
                  {formatDate(request.receivedAt, true)}
                </DescriptionRow>
              ) : null}
            </DescriptionList>
          </Panel>
        </div>
      </div>
    </>
  );
}
