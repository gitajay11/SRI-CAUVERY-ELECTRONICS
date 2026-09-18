import Link from 'next/link';
import type { CancellationStatus } from '@tamizh/db/enums';
import { formatINR } from '@tamizh/core/money';
import { formatDate, truncate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listCancellations } from '@/services/cancellations';
import { PageHeader, Panel, Badge } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { CancellationStageBadge, OrderStatusBadge } from '@/components/orders/OrderBadges';
import { BanIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Cancel requests' };

const PAGE_SIZE = 25;

export default async function CancellationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission('orders.view');
  const { t, locale, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as CancellationStatus | undefined) ?? 'ALL';

  const { rows, total, open } = await listCancellations({
    q: first(params.q),
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'request',
      header: t('cancellations.requestNumber'),
      mobile: 'primary',
      cell: (row) => (
        <span className="min-w-0">
          <span className="block font-mono text-sm font-medium text-slate-900">
            {row.requestNumber}
          </span>
          <Link
            href={`/orders/${row.orderNumber}`}
            className="block font-mono text-xs text-slate-500 hover:text-link hover:underline"
          >
            {row.orderNumber}
          </Link>
        </span>
      ),
    },
    {
      key: 'customer',
      header: t('cancellations.customer'),
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="min-w-0">
          <span className="block text-slate-700">{row.customerName}</span>
          <span className="block text-xs text-slate-500">{row.customerPhone}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      header: t('cancellations.reason'),
      hideBelow: 'lg',
      mobile: 'secondary',
      cell: (row) => <span className="text-slate-600">{truncate(row.reason, 60)}</span>,
    },
    {
      key: 'order',
      header: t('common.status'),
      align: 'center',
      hideBelow: 'xl',
      cell: (row) => <OrderStatusBadge status={row.orderStatus} locale={locale} />,
    },
    {
      key: 'status',
      header: t('cancellations.decision'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => <CancellationStageBadge stage={row.stage} locale={locale} />,
    },
    {
      key: 'date',
      header: t('cancellations.requested'),
      align: 'right',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => <span className="text-slate-500">{formatDate(row.requestedAt)}</span>,
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
        title={t('cancellations.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
        action={
          open > 0 ? (
            <Badge tone="caution">{t('cancellations.openCount', { count: open })}</Badge>
          ) : null
        }
      />

      <FilterBar
        basePath="/cancellations"
        params={params}
        searchPlaceholder={t('cancellations.searchPlaceholder')}
        selects={[
          {
            name: 'status',
            label: t('cancellations.decision'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'PENDING', label: dict['cancellation.PENDING'] },
              { value: 'APPROVED', label: dict['cancellation.APPROVED'] },
              { value: 'REJECTED', label: dict['cancellation.REJECTED'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/cancellations/${row.requestNumber}`}
          caption={t('cancellations.title')}
          empty={{ icon: <BanIcon />, title: t('cancellations.empty') }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/cancellations', params, { page: target })}
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
