import Link from 'next/link';
import { db } from '@tamizh/db';
import type { ProductStatus } from '@tamizh/db/enums';
import { formatINR, discountPercent } from '@tamizh/core/money';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listProducts } from '@/services/products';
import { PageHeader, Panel, Badge } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { ButtonLink } from '@/components/ui/Button';
import { ProductRowActions } from '@/components/products/ProductRowActions';
import { Thumb } from '@/components/ui/Thumb';
import { BoxesIcon, PlusIcon } from '@/components/ui/Icons';
import { buildQuery, first, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Products' };

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('products.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (first(params.status) as ProductStatus | undefined) ?? 'ALL';
  const categoryId = first(params.category);

  const [{ rows, total }, categories] = await Promise.all([
    listProducts({
      q: first(params.q),
      categoryId,
      status,
      page,
      pageSize: PAGE_SIZE,
    }),
    db.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  const canEdit = identity.permissions.has('products.update');
  const canCreate = identity.permissions.has('products.create');

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
      key: 'price',
      header: t('common.price'),
      align: 'right',
      mobile: 'trailing',
      cell: (row) => (
        <span>
          <span className="block font-semibold tabular-nums text-slate-900">
            {formatINR(row.price)}
          </span>
          {row.mrp > row.price ? (
            <span className="block text-xs text-slate-400">
              {discountPercent(row.mrp, row.price)}% off
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'stock',
      header: t('products.stock'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => (
        <Badge
          tone={
            row.stock <= 0 ? 'critical' : row.stock <= row.lowStockThreshold ? 'caution' : 'neutral'
          }
        >
          {row.stock}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="flex flex-wrap justify-center gap-1">
          {/* Active is the state 24 of 25 rows are in, so it gets the quiet
              treatment: filling every row with gold would make the column
              louder than the products themselves and tell staff nothing. The
              exceptions are what the eye should catch — a draft is unfinished
              work, an archived product is one the shop has stopped selling. */}
          <Badge
            tone={
              row.status === 'DRAFT' ? 'caution' : row.status === 'ACTIVE' ? 'neutral' : 'info'
            }
          >
            {dict[`productStatus.${row.status}` as 'productStatus.ACTIVE']}
          </Badge>
          {row.isFeatured ? <Badge tone="gold">★</Badge> : null}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobile: 'hidden',
      cell: (row) =>
        canEdit ? (
          <ProductRowActions
            id={row.id}
            name={row.name}
            status={row.status}
            canDelete={identity.permissions.has('products.delete')}
            canPublish={identity.permissions.has('products.publish')}
            canCreate={canCreate}
          />
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('products.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
        action={
          canCreate ? (
            <ButtonLink href="/products/new">
              <PlusIcon className="text-[1.1em]" />
              {t('products.new')}
            </ButtonLink>
          ) : null
        }
      />

      <FilterBar
        basePath="/products"
        params={params}
        searchPlaceholder={t('products.searchPlaceholder')}
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
            name: 'status',
            label: t('products.status'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'ACTIVE', label: dict['productStatus.ACTIVE'] },
              { value: 'DRAFT', label: dict['productStatus.DRAFT'] },
              { value: 'ARCHIVED', label: dict['productStatus.ARCHIVED'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={canEdit ? (row) => `/products/${row.id}` : undefined}
          caption={t('products.title')}
          empty={{
            icon: <BoxesIcon />,
            title: t('common.noResults'),
            action: canCreate ? (
              <ButtonLink href="/products/new">{t('products.new')}</ButtonLink>
            ) : null,
          }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/products', params, { page: target })}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            showing: dict['common.showing'],
            page: dict['common.page'],
          }}
        />
      </Panel>

      <p className="mt-3 text-xs text-slate-400">
        <Link href="/inventory" className="hover:text-link hover:underline">
          {t('inventory.title')} →
        </Link>{' '}
        {t('inventory.auditNote')}
      </p>
    </>
  );
}
