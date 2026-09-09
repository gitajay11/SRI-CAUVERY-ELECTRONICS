import Link from 'next/link';
import type { PaymentStatus } from '@tamizh/db/enums';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listPayments } from '@/services/money';
import { PageHeader, Panel, StatCard } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { PaymentStatusBadge } from '@/components/orders/OrderBadges';
import { ReceiptIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Payments' };

const PAGE_SIZE = 25;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('payments.view');
  const { t, locale, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as PaymentStatus | undefined) ?? 'ALL';

  const { rows, total, summary } = await listPayments({
    q: first(params.q),
    status,
    provider: first(params.provider),
    page,
    pageSize: PAGE_SIZE,
  });

  const totalFor = (...statuses: PaymentStatus[]) =>
    summary
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + row.amount, 0);

  const canSeeOrders = identity.permissions.has('orders.view');

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'order',
      header: t('orders.orderNumber'),
      mobile: 'primary',
      cell: (row) => (
        <span className="min-w-0">
          {canSeeOrders ? (
            <Link
              href={`/orders/${row.orderNumber}`}
              className="block font-mono text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline"
            >
              {row.orderNumber}
            </Link>
          ) : (
            <span className="block font-mono text-sm font-medium text-slate-900">
              {row.orderNumber}
            </span>
          )}
          <span className="block truncate text-xs text-slate-500">{row.customerName}</span>
        </span>
      ),
    },
    {
      key: 'provider',
      header: t('payments.provider'),
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="text-slate-600">
          {row.provider}
          {row.reference ? (
            <span className="block font-mono text-xs text-slate-400">{row.reference}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      mobile: 'meta',
      cell: (row) => (
        <span>
          <PaymentStatusBadge status={row.status} locale={locale} />
          {row.failureReason ? (
            <span className="mt-0.5 block text-xs text-critical-600">{row.failureReason}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('payments.amount'),
      align: 'right',
      mobile: 'trailing',
      cell: (row) => (
        <span>
          <span className="block font-semibold tabular-nums text-slate-900">
            {formatINR(row.amount)}
          </span>
          {row.refunded > 0 ? (
            <span className="block text-xs text-critical-600">
              −{formatINR(row.refunded)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('payments.paidOn'),
      align: 'right',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="text-slate-500">
          {row.paidAt ? formatDate(row.paidAt, true) : formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('payments.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('payments.received')}
          value={formatINR(totalFor('PAID', 'PARTIALLY_REFUNDED'))}
          tone="positive"
        />
        <StatCard
          label={t('payments.awaiting')}
          value={formatINR(totalFor('PENDING', 'COD_PENDING', 'AUTHORIZED'))}
          tone="caution"
        />
        <StatCard
          label={t('payments.refundedTotal')}
          value={formatINR(totalFor('REFUNDED'))}
        />
        <StatCard
          label={t('payments.failedTotal')}
          value={formatINR(totalFor('FAILED'))}
          tone={totalFor('FAILED') > 0 ? 'critical' : 'neutral'}
        />
      </div>

      <FilterBar
        basePath="/payments"
        params={params}
        searchPlaceholder={t('payments.searchPlaceholder')}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'PAID', label: dict['payment.PAID'] },
              { value: 'PENDING', label: dict['payment.PENDING'] },
              { value: 'COD_PENDING', label: dict['payment.COD_PENDING'] },
              { value: 'FAILED', label: dict['payment.FAILED'] },
              { value: 'REFUNDED', label: dict['payment.REFUNDED'] },
            ],
          },
          {
            name: 'provider',
            label: t('payments.provider'),
            value: first(params.provider) ?? '',
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'cod', label: 'COD' },
              { value: 'razorpay', label: 'Razorpay' },
              { value: 'mock', label: 'Mock' },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          caption={t('payments.title')}
          empty={{ icon: <ReceiptIcon />, title: t('payments.empty') }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/payments', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">{t('payments.readOnlyNote')}</p>
    </>
  );
}
