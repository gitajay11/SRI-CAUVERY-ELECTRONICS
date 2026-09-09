import Link from 'next/link';
import type { RefundStatus } from '@tamizh/db/enums';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listRefunds } from '@/services/money';
import { PageHeader, Panel, StatCard, EmptyState } from '@/components/ui/Primitives';
import { Pagination } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { RefundStatusBadge } from '@/components/orders/OrderBadges';
import { RefundDecision } from '@/components/refunds/RefundDecision';
import { RotateLeftIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Refunds' };

const PAGE_SIZE = 20;

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('refunds.view');
  const { t, locale, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as RefundStatus | undefined) ?? 'ALL';

  const { rows, total, pending, paidOut } = await listRefunds({
    q: first(params.q),
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const canApprove = identity.permissions.has('refunds.approve');

  return (
    <>
      <PageHeader
        title={t('refunds.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label={t('refunds.pendingCount', { count: pending })}
          value={pending}
          tone={pending > 0 ? 'caution' : 'neutral'}
        />
        <StatCard label={t('refunds.paidOut')} value={formatINR(paidOut)} />
      </div>

      <FilterBar
        basePath="/refunds"
        params={params}
        searchPlaceholder={t('refunds.searchPlaceholder')}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'PENDING', label: dict['refund.PENDING'] },
              { value: 'APPROVED', label: dict['refund.APPROVED'] },
              { value: 'PROCESSING', label: dict['refund.PROCESSING'] },
              { value: 'COMPLETED', label: dict['refund.COMPLETED'] },
              { value: 'REJECTED', label: dict['refund.REJECTED'] },
              { value: 'FAILED', label: dict['refund.FAILED'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        {rows.length === 0 ? (
          <EmptyState icon={<RotateLeftIcon />} title={t('refunds.empty')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((refund) => (
              <li key={refund.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold tabular-nums text-slate-900">
                        {formatINR(refund.amount)}
                      </span>
                      <RefundStatusBadge status={refund.status} locale={locale} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{refund.reason}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                      <Link
                        href={`/orders/${refund.orderNumber}`}
                        className="font-mono hover:text-link hover:underline"
                      >
                        {refund.orderNumber}
                      </Link>
                      <span>{refund.customerName}</span>
                      {refund.returnNumber ? (
                        <Link
                          href={`/returns/${refund.returnNumber}`}
                          className="font-mono hover:text-link hover:underline"
                        >
                          {refund.returnNumber}
                        </Link>
                      ) : null}
                      <span>
                        {t('refunds.requestedOn')} {formatDate(refund.requestedAt)}
                      </span>
                      {refund.processedAt ? (
                        <span>
                          {t('refunds.processed')} {formatDate(refund.processedAt)}
                        </span>
                      ) : null}
                      {refund.reference ? (
                        <span className="font-mono">{refund.reference}</span>
                      ) : null}
                      {refund.approvedBy ? <span>{refund.approvedBy}</span> : null}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto">
                    <RefundDecision
                      id={refund.id}
                      status={refund.status}
                      amount={refund.amount}
                      orderNumber={refund.orderNumber}
                      canApprove={canApprove}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/refunds', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">{t('refunds.approvalNote')}</p>
    </>
  );
}
