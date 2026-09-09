import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listCustomers } from '@/services/customers';
import { PageHeader, Panel, Badge } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { UsersIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Customers' };

const PAGE_SIZE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission('customers.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as 'active' | 'blocked' | undefined) ?? 'all';
  const sort = (first(params.sort) as 'spend' | 'orders' | undefined) ?? 'recent';

  const { rows, total } = await listCustomers({
    q: first(params.q),
    status,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'customer',
      header: t('common.name'),
      mobile: 'primary',
      cell: (row) => (
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900">{row.name}</span>
            {row.blocked ? <Badge tone="critical">{t('customers.blocked')}</Badge> : null}
          </span>
          <span className="block truncate text-xs text-slate-500">{row.email}</span>
        </span>
      ),
    },
    {
      key: 'phone',
      header: t('common.phone'),
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="tabular-nums text-slate-600">{row.phone ?? '—'}</span>
      ),
    },
    {
      key: 'orders',
      header: t('customers.orderCount'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => <span className="tabular-nums text-slate-700">{row.orderCount}</span>,
    },
    {
      key: 'spent',
      header: t('customers.totalSpent'),
      align: 'right',
      mobile: 'trailing',
      cell: (row) => (
        <span className="font-semibold tabular-nums text-slate-900">
          {formatINR(row.totalSpent)}
        </span>
      ),
    },
    {
      key: 'last',
      header: t('customers.lastOrder'),
      align: 'right',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="text-slate-500">
          {row.lastOrderAt ? formatDate(row.lastOrderAt) : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('customers.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
      />

      <FilterBar
        basePath="/customers"
        params={params}
        searchPlaceholder={t('customers.searchPlaceholder')}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: status === 'all' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'active', label: dict['customers.active'] },
              { value: 'blocked', label: dict['customers.blocked'] },
            ],
          },
          {
            name: 'sort',
            label: t('common.filter'),
            value: sort === 'recent' ? '' : sort,
            options: [
              { value: '', label: dict['customers.sortRecent'] },
              { value: 'spend', label: dict['customers.sortSpend'] },
              { value: 'orders', label: dict['customers.sortOrders'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/customers/${row.id}`}
          caption={t('customers.title')}
          empty={{ icon: <UsersIcon />, title: t('common.noResults') }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/customers', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">{t('customers.privacyNote')}</p>
    </>
  );
}
