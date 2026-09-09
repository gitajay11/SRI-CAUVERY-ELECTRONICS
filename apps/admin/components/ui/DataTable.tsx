import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { EmptyState } from './Primitives';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

/**
 * The admin's list view.
 *
 * One definition renders two layouts: a real `<table>` from `md` up, and a
 * stack of cards below it. A six-column table is unusable at 375px, and shop
 * staff check orders on a phone far more often than at a desk — so the mobile
 * form is a first-class rendering, not an overflow scroll.
 *
 * Columns declare which of them matter on a small screen (`primary`,
 * `secondary`, `meta`), so the card layout stays readable without a second set
 * of components to keep in step.
 */

export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** Cell content for the table layout. */
  cell: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Hide this column on narrower desktop widths. */
  hideBelow?: 'lg' | 'xl';
  width?: string;
  /**
   * Where this column goes in the mobile card:
   *  - `primary`   the headline (usually the identifier)
   *  - `secondary` supporting line under it
   *  - `trailing`  right-aligned, for amounts and statuses
   *  - `meta`      small print at the bottom
   *  - `hidden`    omitted on mobile
   */
  mobile?: 'primary' | 'secondary' | 'trailing' | 'meta' | 'hidden';
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Makes the whole row navigate. Keeps keyboard access via the primary cell. */
  rowHref?: (row: Row) => string;
  empty: { title: string; body?: string; icon?: ReactNode; action?: ReactNode };
  caption?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowHref,
  empty,
  caption,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <EmptyState icon={empty.icon} title={empty.title} body={empty.body} action={empty.action} />;
  }

  const align = (column: Column<Row>) =>
    column.align === 'right'
      ? 'text-right'
      : column.align === 'center'
        ? 'text-center'
        : 'text-left';

  const hide = (column: Column<Row>) =>
    column.hideBelow === 'lg'
      ? 'hidden lg:table-cell'
      : column.hideBelow === 'xl'
        ? 'hidden xl:table-cell'
        : '';

  const byMobile = (slot: Column<Row>['mobile']) =>
    columns.filter((column) => (column.mobile ?? 'meta') === slot);

  const primary = byMobile('primary');
  const secondary = byMobile('secondary');
  const trailing = byMobile('trailing');
  const meta = byMobile('meta');

  return (
    <>
      {/* Desktop */}
      <div className="table-scroll hidden md:block">
        <table className="w-full text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn('px-4 py-2.5 font-semibold', align(column), hide(column))}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-slate-25">
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn('px-4 py-3 align-middle', align(column), hide(column))}
                  >
                    {index === 0 && rowHref ? (
                      <Link
                        href={rowHref(row)}
                        className="block rounded outline-offset-2 hover:text-brand-700"
                      >
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          const body = (
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                {primary.map((column) => (
                  <div key={column.key} className="font-medium text-slate-900">
                    {column.cell(row)}
                  </div>
                ))}
                {secondary.map((column) => (
                  <div key={column.key} className="mt-0.5 truncate text-sm text-slate-600">
                    {column.cell(row)}
                  </div>
                ))}
                {meta.length > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {meta.map((column) => (
                      <span key={column.key}>{column.cell(row)}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              {trailing.length > 0 ? (
                <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                  {trailing.map((column) => (
                    <div key={column.key}>{column.cell(row)}</div>
                  ))}
                </div>
              ) : null}
            </div>
          );

          return (
            <li key={key}>
              {rowHref ? (
                <Link href={rowHref(row)} className="block hover:bg-slate-25">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
  labels,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; showing: string; page: string };
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={labels.page}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"
    >
      <p className="text-xs text-slate-500">
        {labels.showing
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              rel="prev"
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              <ChevronLeftIcon />
              <span className="hidden sm:inline">{labels.previous}</span>
            </Link>
          ) : null}
          <span className="px-2 text-xs text-slate-500">
            {labels.page.replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              rel="next"
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              <span className="hidden sm:inline">{labels.next}</span>
              <ChevronRightIcon />
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
