import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import type { OrderStatus, PaymentStatus } from '@tamizh/db/enums';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listOrders } from '@/services/orders';
import { PageHeader, Panel } from '@/components/ui/Primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/filters/FilterBar';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/OrderBadges';
import { ReceiptIcon } from '@/components/ui/Icons';
import { buildQuery, readPage, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Orders' };

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'COD_PENDING',
];

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission('orders.view');
  const { t, locale, dict } = await getI18n();
  const params = await searchParams;

  const page = readPage(params.page);
  const status = (params.status as OrderStatus | undefined) ?? 'ALL';
  const paymentStatus = (params.payment as PaymentStatus | undefined) ?? 'ALL';
  const method = (params.method as 'COD' | 'ONLINE' | undefined) ?? 'ALL';

  const { rows, total } = await listOrders({
    q: typeof params.q === 'string' ? params.q : undefined,
    status,
    paymentStatus,
    method,
    page,
    pageSize: PAGE_SIZE,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'orderNumber',
      header: t('orders.orderNumber'),
      mobile: 'primary',
      cell: (row) => (
        <span className="font-mono text-sm font-semibold">{row.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: t('orders.customer'),
      mobile: 'secondary',
      cell: (row) => (
        <>
          <span className="block truncate text-slate-900">{row.customerName}</span>
          <span className="block text-xs text-slate-500">{row.customerPhone}</span>
        </>
      ),
    },
    {
      key: 'placed',
      header: t('orders.placed'),
      hideBelow: 'lg',
      mobile: 'meta',
      cell: (row) => (
        <span className="text-slate-600">{formatDate(row.placedAt, true)}</span>
      ),
    },
    {
      key: 'items',
      header: t('orders.items'),
      align: 'center',
      hideBelow: 'xl',
      mobile: 'meta',
      cell: (row) => <span className="text-slate-600">{row.itemCount}</span>,
    },
    {
      key: 'payment',
      header: t('orders.payment'),
      align: 'center',
      hideBelow: 'lg',
      mobile: 'hidden',
      cell: (row) => <PaymentStatusBadge status={row.paymentStatus} locale={locale} />,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      mobile: 'trailing',
      cell: (row) => <OrderStatusBadge status={row.status} locale={locale} />,
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      mobile: 'trailing',
      cell: (row) => (
        <span className="font-semibold tabular-nums">{formatINR(row.total)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('orders.title')}
        description={t('common.showing', {
          from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
          to: Math.min(page * PAGE_SIZE, total),
          total,
        })}
      />

      <FilterBar
        basePath="/orders"
        params={params}
        searchPlaceholder={t('orders.searchPlaceholder')}
        selects={[
          {
            name: 'status',
            label: t('orders.filterStatus'),
            value: status === 'ALL' ? '' : status,
            options: [
              { value: '', label: t('common.viewAll') },
              ...ORDER_STATUSES.map((value) => ({
                value,
                label: dict[`status.${value}` as 'status.PENDING'],
              })),
            ],
          },
          {
            name: 'payment',
            label: t('orders.filterPayment'),
            value: paymentStatus === 'ALL' ? '' : paymentStatus,
            options: [
              { value: '', label: t('common.viewAll') },
              ...PAYMENT_STATUSES.map((value) => ({
                value,
                label: dict[`payment.${value}` as 'payment.PENDING'],
              })),
            ],
          },
          {
            name: 'method',
            label: t('orders.filterMethod'),
            value: method === 'ALL' ? '' : method,
            options: [
              { value: '', label: t('common.viewAll') },
              { value: 'COD', label: dict['method.COD'] },
              { value: 'ONLINE', label: dict['method.ONLINE'] },
            ],
          },
        ]}
      />

      <Panel padded={false} className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/orders/${row.orderNumber}`}
          caption={t('orders.title')}
          empty={{
            icon: <ReceiptIcon />,
            title: t('orders.empty'),
            body: t('common.noResults'),
          }}
        />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          buildHref={(target) => buildQuery('/orders', params, { page: target })}
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
