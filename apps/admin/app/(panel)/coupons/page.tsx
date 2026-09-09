import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listCoupons } from '@/services/coupons';
import { PageHeader, Panel, Badge } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { ButtonLink } from '@/components/ui/Button';
import { CouponRowActions } from '@/components/coupons/CouponRowActions';
import { TicketIcon, PlusIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Coupons' };

const PAGE_SIZE = 25;

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('coupons.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const state =
    (first(params.state) as 'active' | 'scheduled' | 'expired' | 'inactive' | undefined) ??
    'all';

  const { rows, total } = await listCoupons({
    q: first(params.q),
    state,
    page,
    pageSize: PAGE_SIZE,
  });

  const canManage = identity.permissions.has('coupons.manage');

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'code',
      header: t('coupons.code'),
      mobile: 'primary',
      cell: (row) => (
        <span className="min-w-0">
          <span className="block font-mono text-sm font-bold tracking-wide text-slate-900">
            {row.code}
          </span>
          <span className="block truncate text-xs text-slate-500">{row.description}</span>
        </span>
      ),
    },
    {
      key: 'value',
      header: t('coupons.value'),
      align: 'right',
      mobile: 'trailing',
      cell: (row) => (
        <span>
          <span className="block font-semibold tabular-nums text-slate-900">
            {row.type === 'PERCENT'
              ? `${row.value / 100}%`
              : formatINR(row.value)}
          </span>
          {row.minOrder > 0 ? (
            <span className="block text-xs text-slate-400">
              {t('coupons.minOrder')} {formatINR(row.minOrder)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'used',
      header: t('coupons.used'),
      align: 'center',
      mobile: 'meta',
      cell: (row) => (
        <span className="tabular-nums text-slate-600">
          {row.usedCount}
          {row.usageLimit ? ` / ${row.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'given',
      header: t('coupons.discountGiven'),
      align: 'right',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="tabular-nums text-slate-600">{formatINR(row.discountGiven)}</span>
      ),
    },
    {
      key: 'window',
      header: t('coupons.endsAt'),
      align: 'right',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="text-slate-500">
          {row.endsAt ? formatDate(row.endsAt) : t('coupons.unlimited')}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => {
        const tones = {
          active: 'positive',
          scheduled: 'info',
          expired: 'critical',
          inactive: 'neutral',
        } as const;
        const labels = {
          active: t('coupons.active'),
          scheduled: t('coupons.scheduled'),
          expired: t('coupons.expired'),
          inactive: t('coupons.inactive'),
        };
        return <Badge tone={tones[row.state]}>{labels[row.state]}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobile: 'hidden',
      cell: (row) =>
        canManage ? <CouponRowActions id={row.id} code={row.code} /> : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('coupons.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
        action={
          canManage ? (
            <ButtonLink href="/coupons/new">
              <PlusIcon className="text-[1.1em]" />
              {t('coupons.new')}
            </ButtonLink>
          ) : null
        }
      />

      <FilterBar
        basePath="/coupons"
        params={params}
        searchPlaceholder={t('coupons.searchPlaceholder')}
        selects={[
          {
            name: 'state',
            label: t('common.status'),
            value: state === 'all' ? '' : state,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'active', label: dict['coupons.active'] },
              { value: 'scheduled', label: dict['coupons.scheduled'] },
              { value: 'expired', label: dict['coupons.expired'] },
              { value: 'inactive', label: dict['coupons.inactive'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={canManage ? (row) => `/coupons/${row.id}` : undefined}
          caption={t('coupons.title')}
          empty={{
            icon: <TicketIcon />,
            title: t('coupons.empty'),
            action: canManage ? (
              <ButtonLink href="/coupons/new">{t('coupons.new')}</ButtonLink>
            ) : null,
          }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/coupons', params, { page: target })}
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
