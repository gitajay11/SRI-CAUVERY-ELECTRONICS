import Link from 'next/link';
import { db } from '@tamizh/db';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listStock } from '@/services/inventory';
import { PageHeader, Panel, Badge, StatCard } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { Thumb } from '@/components/ui/Thumb';
import { WarehouseIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Inventory' };

const PAGE_SIZE = 25;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('inventory.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const filter = (first(params.filter) as 'low' | 'out' | undefined) ?? 'all';
  const categoryId = first(params.category);

  const [{ rows, total }, categories, outCount, lowRows] = await Promise.all([
    listStock({ q: first(params.q), categoryId, filter, page, pageSize: PAGE_SIZE }),
    db.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parentId: true },
    }),
    db.product.count({ where: { deletedAt: null, stock: { lte: 0 } } }),
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "Product"
      WHERE "deletedAt" IS NULL AND "stock" <= "lowStockThreshold"`,
  ]);

  const lowCount = Number(lowRows[0]?.count ?? 0);
  const canAdjust = identity.permissions.has('inventory.adjust');

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'product',
      header: t('common.name'),
      mobile: 'primary',
      cell: (row) => (
        <span className="flex items-center gap-3">
          <Thumb url={row.imageUrl} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900">{row.name}</span>
            <span className="block font-mono text-xs text-slate-500">{row.sku}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'category',
      header: t('products.category'),
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => <span className="text-slate-600">{row.categoryName}</span>,
    },
    {
      key: 'onHand',
      header: t('inventory.onHand'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => (
        <Badge
          tone={
            row.stock <= 0 ? 'critical' : row.stock <= row.threshold ? 'caution' : 'neutral'
          }
        >
          {row.stock}
        </Badge>
      ),
    },
    {
      key: 'reserved',
      header: t('inventory.reserved'),
      align: 'center',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => <span className="tabular-nums text-slate-600">{row.reserved}</span>,
    },
    {
      key: 'available',
      header: t('inventory.available'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => (
        <span
          className={`tabular-nums font-semibold ${
            row.available <= 0 ? 'text-critical-600' : 'text-slate-900'
          }`}
        >
          {row.available}
        </span>
      ),
    },
    {
      key: 'threshold',
      header: t('inventory.threshold'),
      align: 'center',
      hideBelow: 'lg',
      mobile: 'hidden',
      cell: (row) => <span className="tabular-nums text-slate-400">{row.threshold}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Link href="/inventory?filter=low" className="rounded-panel focus:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/25">
          <StatCard
            label={t('inventory.summaryLow')}
            value={lowCount}
            tone={lowCount > 0 ? 'caution' : 'neutral'}
            hint={t('inventory.lowStockOnly')}
          />
        </Link>
        <Link href="/inventory?filter=out" className="rounded-panel focus:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/25">
          <StatCard
            label={t('inventory.summaryOut')}
            value={outCount}
            tone={outCount > 0 ? 'critical' : 'neutral'}
            hint={t('inventory.outOfStockOnly')}
          />
        </Link>
      </div>

      <FilterBar
        basePath="/inventory"
        params={params}
        searchPlaceholder={t('inventory.searchPlaceholder')}
        selects={[
          {
            name: 'category',
            label: t('products.category'),
            value: categoryId ?? '',
            options: [
              { value: '', label: t('common.viewAll') },
              ...categories.map((category) => ({
                value: category.id,
                label: category.parentId ? `— ${category.name}` : category.name,
              })),
            ],
          },
          {
            name: 'filter',
            label: t('common.filter'),
            value: filter === 'all' ? '' : filter,
            options: [
              { value: '', label: dict['inventory.filterAll'] },
              { value: 'low', label: dict['inventory.lowStockOnly'] },
              { value: 'out', label: dict['inventory.outOfStockOnly'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/inventory/${row.id}`}
          caption={t('inventory.title')}
          empty={{ icon: <WarehouseIcon />, title: t('common.noResults') }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/inventory', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">
        {canAdjust ? (
          <>
            {t('inventory.auditNote')}{' '}
            <Link href="/products" className="hover:text-brand-700 hover:underline">
              {t('products.title')} →
            </Link>
          </>
        ) : (
          t('inventory.auditNote')
        )}
      </p>
    </>
  );
}
