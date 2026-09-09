import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { cn } from '@tamizh/core/utils';

/**
 * Charts, drawn as plain SVG and HTML.
 *
 * No charting library: these three shapes are simple, they server-render with
 * the rest of the page, and they add nothing to the JavaScript bundle — which
 * matters on the phone connection a shop owner actually uses.
 *
 * Every chart is paired with the same numbers in a `<table>` behind a
 * disclosure, so the data is reachable by a screen reader and copyable into a
 * spreadsheet rather than locked inside a picture.
 */

// ---------------------------------------------------------------------------
// Bar chart — revenue or orders over time
// ---------------------------------------------------------------------------

export function TrendChart({
  data,
  label,
  tableLabel,
  emptyLabel,
  metric = 'revenue',
}: {
  data: { date: string; revenue: number; orders: number }[];
  label: string;
  tableLabel: string;
  emptyLabel: string;
  metric?: 'revenue' | 'orders';
}) {
  const values = data.map((point) => (metric === 'revenue' ? point.revenue : point.orders));
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  const format = (value: number) =>
    metric === 'revenue' ? formatINR(value) : String(value);

  // Below ~60 points bars stay legible; beyond that they become a sparkline.
  const dense = data.length > 60;

  return (
    <div>
      <div
        className="flex h-40 items-end gap-px sm:gap-0.5"
        role="img"
        aria-label={`${label}: ${format(total)} across ${data.length} days`}
      >
        {data.map((point) => {
          const value = metric === 'revenue' ? point.revenue : point.orders;
          const height = value === 0 ? 2 : Math.max(3, Math.round((value / max) * 100));
          return (
            <div
              key={point.date}
              className="group relative flex flex-1 items-end justify-center"
              style={{ height: '100%' }}
            >
              <div
                className={cn(
                  'w-full bg-brand-400 transition-colors group-hover:bg-brand-600',
                  dense ? 'rounded-none' : 'rounded-t-sm',
                )}
                style={{ height: `${height}%` }}
                title={`${formatDate(point.date)}: ${format(value)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{formatDate(data[0]!.date)}</span>
        <span>{formatDate(data[data.length - 1]!.date)}</span>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800">
          {tableLabel}
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="py-1.5 font-semibold">
                  Date
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Orders
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((point) => (
                <tr key={point.date}>
                  <td className="py-1.5 text-slate-600">{formatDate(point.date)}</td>
                  <td className="py-1.5 text-right text-slate-600">{point.orders}</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">
                    {formatINR(point.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bars — top products, categories, payment methods
// ---------------------------------------------------------------------------

export function RankedBars({
  rows,
  emptyLabel,
  valueFormat = 'money',
}: {
  rows: { label: string; sublabel?: string; value: number; secondary?: string }[];
  emptyLabel: string;
  valueFormat?: 'money' | 'number';
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((row) => row.value), 1);
  const format = (value: number) =>
    valueFormat === 'money' ? formatINR(value) : value.toLocaleString('en-IN');

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-800">
              {row.label}
              {row.sublabel ? (
                <span className="ml-1.5 font-normal text-slate-400">{row.sublabel}</span>
              ) : null}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
              {format(row.value)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full bg-brand-500"
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              />
            </span>
            {row.secondary ? (
              <span className="w-16 shrink-0 text-right text-xs text-slate-400">
                {row.secondary}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Distribution — order status, as a single stacked bar plus a legend
// ---------------------------------------------------------------------------

const DISTRIBUTION_COLOURS = [
  'bg-brand-500',
  'bg-info-500',
  'bg-caution-500',
  'bg-positive-500',
  'bg-slate-400',
  'bg-critical-500',
  'bg-brand-300',
  'bg-info-100',
];

export function Distribution({
  rows,
  emptyLabel,
}: {
  rows: { label: string; count: number }[];
  emptyLabel: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={rows.map((row) => `${row.label}: ${row.count}`).join(', ')}
      >
        {rows.map((row, index) => (
          <span
            key={row.label}
            className={DISTRIBUTION_COLOURS[index % DISTRIBUTION_COLOURS.length]}
            style={{ width: `${(row.count / total) * 100}%` }}
            title={`${row.label}: ${row.count}`}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {rows.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2">
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                DISTRIBUTION_COLOURS[index % DISTRIBUTION_COLOURS.length],
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
