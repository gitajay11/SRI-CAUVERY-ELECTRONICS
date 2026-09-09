import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requireAdmin } from '@/lib/session';
import { defaultRouteFor } from '@/lib/navigation';
import { getI18n } from '@/i18n/server';
import { getDashboard, resolveRange, type RangeKey } from '@/services/dashboard';
import { PageHeader, Panel, StatCard } from '@/components/ui/Primitives';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { AttentionStrip } from '@/components/dashboard/AttentionStrip';
import { Distribution, RankedBars, TrendChart } from '@/components/charts/Charts';
import { OrderStatusBadge } from '@/components/orders/OrderBadges';
import {
  BoxesIcon,
  CartIcon,
  ChartIcon,
  ReceiptIcon,
  UsersIcon,
} from '@/components/ui/Icons';

export const metadata = { title: 'Dashboard' };

const RANGE_KEYS: RangeKey[] = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'thisMonth',
  'previousMonth',
  'custom',
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const identity = await requireAdmin();

  // Someone without dashboard access still has to land somewhere sensible.
  if (!identity.permissions.has('dashboard.view')) {
    redirect(defaultRouteFor(identity.permissions));
  }

  const { t, locale } = await getI18n();
  const params = await searchParams;

  const rangeKey = RANGE_KEYS.includes(params.range as RangeKey)
    ? (params.range as RangeKey)
    : 'last30';
  const range = resolveRange(rangeKey, params.from, params.to);
  const data = await getDashboard(range);

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? 'dash.greeting' : hour < 17 ? 'dash.greetingAfternoon' : 'dash.greetingEvening';
  const firstName = identity.name.split(' ')[0] ?? identity.name;

  return (
    <>
      <PageHeader
        title={t(greetingKey, { name: firstName })}
        description={`${formatDate(data.range.from)} — ${formatDate(data.range.to)}`}
        action={<DateRangePicker current={rangeKey} from={params.from} to={params.to} />}
      />

      <AttentionStrip attention={data.attention} />

      {/* Period figures */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t('dash.revenue')}
          value={formatINR(data.period.revenue)}
          delta={data.deltas.revenue}
          hint={t('dash.comparedTo')}
          icon={<ChartIcon />}
          tone="brand"
        />
        <StatCard
          label={t('dash.orders')}
          value={data.period.orders.toLocaleString('en-IN')}
          delta={data.deltas.orders}
          hint={t('dash.comparedTo')}
          icon={<ReceiptIcon />}
          tone="info"
        />
        <StatCard
          label={t('dash.averageOrder')}
          value={formatINR(data.period.averageOrder)}
          icon={<CartIcon />}
        />
        <StatCard
          label={t('dash.unitsSold')}
          value={data.period.unitsSold.toLocaleString('en-IN')}
          icon={<BoxesIcon />}
        />
        <StatCard
          label={t('dash.customers')}
          value={data.period.newCustomers.toLocaleString('en-IN')}
          delta={data.deltas.newCustomers}
          icon={<UsersIcon />}
          tone="positive"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Trend */}
        <Panel title={t('dash.salesOverTime')} className="lg:col-span-2">
          <TrendChart
            data={data.trend}
            label={t('dash.revenueLabel')}
            tableLabel={t('dash.viewAsTable')}
            emptyLabel={t('dash.noSales')}
          />
        </Panel>

        {/* Order status */}
        <Panel title={t('dash.orderStatus')}>
          <Distribution
            rows={data.statusBreakdown.map((row) => ({
              label: t(`status.${row.status}` as 'status.PENDING'),
              count: row.count,
            }))}
            emptyLabel={t('common.noResults')}
          />

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              {t('dash.paymentMethods')}
            </h3>
            <RankedBars
              rows={data.paymentMethods.map((row) => ({
                label: t(`method.${row.method}` as 'method.COD'),
                value: row.revenue,
                secondary: `${row.orders}`,
              }))}
              emptyLabel={t('common.noResults')}
            />
          </div>
        </Panel>

        {/* Top products */}
        <Panel
          title={t('dash.topProducts')}
          action={
            <Link
              href="/reports/products"
              className="text-sm font-medium text-link hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          }
        >
          <RankedBars
            rows={data.topProducts.map((product) => ({
              label: product.name,
              sublabel: product.sku,
              value: product.revenue,
              secondary: `${product.units} ${t('dash.units')}`,
            }))}
            emptyLabel={t('dash.noSales')}
          />
        </Panel>

        {/* Top categories */}
        <Panel title={t('dash.topCategories')}>
          <RankedBars
            rows={data.topCategories.map((category) => ({
              label: category.name,
              value: category.revenue,
              secondary: `${category.units} ${t('dash.units')}`,
            }))}
            emptyLabel={t('dash.noSales')}
          />
        </Panel>

        {/* Recent orders */}
        <Panel
          title={t('dash.recentOrders')}
          padded={false}
          action={
            <Link
              href="/orders"
              className="text-sm font-medium text-link hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              {t('common.noResults')}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((order) => (
                <li key={order.orderNumber}>
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-25"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold text-slate-900">
                        {order.orderNumber}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {order.customerName} · {formatDate(order.placedAt)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} locale={locale} />
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                      {formatINR(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Lifetime */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dash.totalRevenue')}
          value={formatINR(data.lifetime.revenue)}
        />
        <StatCard
          label={t('dash.totalOrders')}
          value={data.lifetime.orders.toLocaleString('en-IN')}
        />
        <StatCard
          label={t('dash.totalCustomers')}
          value={data.lifetime.customers.toLocaleString('en-IN')}
        />
        <StatCard
          label={t('dash.totalProducts')}
          value={data.lifetime.activeProducts.toLocaleString('en-IN')}
        />
      </div>
    </>
  );
}
