import Link from 'next/link';
import type { ReturnStatus } from '@tamizh/db/enums';
import { formatINR } from '@tamizh/core/money';
import { formatDate, truncate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listReturns } from '@/services/money';
import { PageHeader, Panel, Badge } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { ReturnStatusBadge } from '@/components/orders/OrderBadges';
import { RotateLeftIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Returns' };

const PAGE_SIZE = 25;

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission('returns.view');
  const { t, locale, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as ReturnStatus | undefined) ?? 'ALL';

  const { rows, total, open } = await listReturns({
    q: first(params.q),
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'return',
      header: t('returns.returnNumber'),
      mobile: 'primary',
      cell: (row) => (
        <span className="min-w-0">
          <span className="block font-mono text-sm font-medium text-slate-900">
            {row.returnNumber}
          </span>
          <Link
            href={`/orders/${row.orderNumber}`}
            className="block font-mono text-xs text-slate-500 hover:text-brand-700 hover:underline"
          >
            {row.orderNumber}
          </Link>
        </span>
      ),
    },
    {
      key: 'customer',
      header: t('common.name'),
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => <span className="text-slate-600">{row.customerName}</span>,
    },
    {
      key: 'reason',
      header: t('common.reason'),
      hideBelow: 'lg',
      mobile: 'secondary',
      cell: (row) => (
        <span className="text-slate-600">{truncate(row.reason, 60)}</span>
      ),
    },
    {
      key: 'units',
      header: t('common.quantity'),
      align: 'center',
      mobile: 'meta',
      cell: (row) => <Badge tone="neutral">{row.units}</Badge>,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => <ReturnStatusBadge status={row.status} locale={locale} />,
    },
    {
      key: 'date',
      header: t('returns.requested'),
      align: 'right',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="text-slate-500">{formatDate(row.requestedAt)}</span>
      ),
    },
    {
      key: 'value',
      header: t('common.total'),
      align: 'right',
      hideBelow: 'xl',
      mobile: 'trailing',
      cell: (row) => (
        <span className="tabular-nums text-slate-700">{formatINR(row.orderTotal)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('returns.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
        action={
          open > 0 ? (
            <Badge tone="caution">{t('returns.openCount', { count: open })}</Badge>
          ) : null
        }
      />

      <FilterBar
        basePath="/returns"
        params={params}
        searchPlaceholder={t('returns.searchPlaceholder')}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'REQUESTED', label: dict['return.REQUESTED'] },
              { value: 'APPROVED', label: dict['return.APPROVED'] },
              { value: 'PICKUP_SCHEDULED', label: dict['return.PICKUP_SCHEDULED'] },
              { value: 'RECEIVED', label: dict['return.RECEIVED'] },
              { value: 'REFUND_PENDING', label: dict['return.REFUND_PENDING'] },
              { value: 'REFUNDED', label: dict['return.REFUNDED'] },
              { value: 'REJECTED', label: dict['return.REJECTED'] },
              { value: 'CLOSED', label: dict['return.CLOSED'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/returns/${row.returnNumber}`}
          caption={t('returns.title')}
          empty={{ icon: <RotateLeftIcon />, title: t('returns.empty') }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/returns', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>
    </>
  );
}
