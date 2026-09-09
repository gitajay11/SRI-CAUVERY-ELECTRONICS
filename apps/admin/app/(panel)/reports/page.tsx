import { formatINR } from '@tamizh/core/money';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { resolveRange, type RangeKey } from '@/services/dashboard';
import { getInterestReport, getSalesReport } from '@/services/reports';
import { PageHeader, Panel, StatCard, Badge } from '@/components/ui/Primitives';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { TrendChart, RankedBars, Distribution } from '@/components/charts/Charts';
import { ExportMenu } from '@/components/reports/ExportMenu';
import { first, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Reports' };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requirePermission('reports.view');
  const { t, dict } = await getI18n();
  const params = await searchParams;

  const rangeKey = (first(params.range) as RangeKey | undefined) ?? 'last30';
  const range = resolveRange(rangeKey, first(params.from), first(params.to));
  const [report, interest] = await Promise.all([
    getSalesReport(range),
    getInterestReport(range),
  ]);

  const canExport = identity.permissions.has('reports.export');
  const { totals } = report;

  return (
    <>
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
        action={
          canExport ? (
            <ExportMenu
              range={rangeKey}
              from={first(params.from)}
              to={first(params.to)}
            />
          ) : null
        }
      />

      <DateRangePicker
        current={rangeKey}
        from={first(params.from)}
        to={first(params.to)}
        basePath="/reports"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('reports.revenue')} value={formatINR(totals.revenue)} tone="brand" />
        <StatCard label={t('reports.orders')} value={totals.orders} />
        <StatCard label={t('reports.units')} value={totals.units} />
        <StatCard
          label={t('reports.averageOrder')}
          value={formatINR(totals.averageOrder)}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('reports.margin')}
          value={formatINR(totals.margin)}
          tone={totals.margin > 0 ? 'positive' : 'critical'}
          hint={t('reports.marginHint')}
        />
        <StatCard label={t('reports.discounts')} value={formatINR(totals.discounts)} />
        <StatCard label={t('reports.deliveryCharged')} value={formatINR(totals.shipping)} />
        <StatCard
          label={t('reports.refunded')}
          value={formatINR(totals.refunds)}
          tone={totals.refunds > 0 ? 'caution' : 'neutral'}
        />
      </div>

      <div className="mt-5 space-y-5">
        <Panel title={t('reports.overTime')}>
          <TrendChart
            data={report.byDay.map((day) => ({
              date: day.date,
              revenue: day.revenue,
              orders: day.orders,
            }))}
            label={t('reports.revenue')}
            tableLabel={t('reports.overTime')}
            emptyLabel={t('common.noResults')}
          />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={t('reports.byCategory')}>
            <RankedBars
              rows={report.byCategory.slice(0, 8).map((row) => ({
                label: row.name,
                sublabel: `${row.units} ${t('reports.units').toLowerCase()}`,
                value: row.revenue,
              }))}
              emptyLabel={t('common.noResults')}
            />
          </Panel>

          <Panel title={t('reports.byPaymentMethod')}>
            <Distribution
              rows={report.byPaymentMethod.map((row) => ({
                label: dict[`method.${row.method}` as 'method.COD'] ?? row.method,
                count: row.orders,
              }))}
              emptyLabel={t('common.noResults')}
            />
          </Panel>
        </div>

        <Panel title={t('reports.byProduct')} padded={false}>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <caption className="sr-only">{t('reports.byProduct')}</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2 font-semibold">
                    {t('common.name')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">
                    {t('reports.units')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">
                    {t('reports.revenue')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">
                    {t('reports.margin')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.byProduct.slice(0, 25).map((row) => (
                  <tr key={row.sku}>
                    <td className="px-4 py-2">
                      <span className="block font-medium text-slate-900">{row.name}</span>
                      <span className="block font-mono text-xs text-slate-500">
                        {row.sku}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.units}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatINR(row.revenue)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span
                        className={row.margin >= 0 ? 'text-positive-600' : 'text-critical-600'}
                      >
                        {formatINR(row.margin)}
                      </span>
                    </td>
                  </tr>
                ))}
                {report.byProduct.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      {t('common.noResults')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={t('reports.wishlisted')} padded={false}>
            {interest.wishlisted.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                {t('reports.noWishlists')}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {interest.wishlisted.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {row.name}
                      </span>
                      <span className="block font-mono text-xs text-slate-500">{row.sku}</span>
                    </span>
                    {row.stock <= 0 ? (
                      <Badge tone="critical">{t('reports.wishlistOutOfStock')}</Badge>
                    ) : null}
                    <span className="text-sm tabular-nums text-slate-600">
                      {t('reports.wishlistCount', { count: row.count })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('reports.interest')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t('reports.newCustomers')} value={interest.newCustomers} />
              <StatCard
                label={t('reports.repeatCustomers')}
                value={interest.repeatCustomers}
              />
              <StatCard
                label={t('reports.abandonedCarts')}
                value={interest.abandonedCarts.carts}
                tone={interest.abandonedCarts.carts > 0 ? 'caution' : 'neutral'}
              />
              <StatCard
                label={t('reports.abandonedValue')}
                value={formatINR(interest.abandonedCarts.value)}
              />
            </div>
          </Panel>
        </div>

        <Panel title={t('reports.byStatus')}>
          <ul className="flex flex-wrap gap-2">
            {report.byStatus.map((row) => (
              <li key={row.status}>
                <Badge tone="neutral">
                  {dict[`status.${row.status}` as 'status.PENDING'] ?? row.status} ·{' '}
                  {row.orders}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
