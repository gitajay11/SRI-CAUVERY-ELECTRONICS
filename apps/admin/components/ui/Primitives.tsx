import type { ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';

/**
 * Presentational building blocks for the admin.
 *
 * Everything here is a server component: no state, no effects, so pages that
 * are mostly read-only ship almost no JavaScript.
 */

// ---------------------------------------------------------------------------
// Panel — the standard content container
// ---------------------------------------------------------------------------

export function Panel({
  title,
  description,
  action,
  footer,
  padded = true,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  /** Turn off for tables, which manage their own padding. */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-panel border border-slate-200 bg-surface shadow-panel',
        className,
      )}
    >
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[0.95rem] font-semibold text-slate-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={cn(padded && 'p-4 sm:p-5')}>{children}</div>

      {footer ? (
        <footer className="border-t border-slate-100 bg-slate-25 px-4 py-2.5 text-sm text-slate-500 sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {breadcrumb ? <div className="mb-2">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'positive'
  | 'caution'
  | 'critical'
  | 'info'
  | 'gold';

/**
 * The palette is one metal plus one red, so these separate by weight rather
 * than by hue: a settled state is filled gold, a state still waiting on
 * somebody is outlined gold, and everything routine is plain type. Only a
 * genuine failure is red.
 *
 * Weight is doing the work colour would do elsewhere, which is why the order
 * below is deliberate — `positive` is the loudest chip on the screen because
 * "paid" and "delivered" are what staff scan a table for.
 */
const badgeTones: Record<BadgeTone, string> = {
  // Plain type — the routine, unremarkable state.
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  // Soft gold — this concerns the shop but needs nothing done.
  brand: 'bg-success-50 text-link ring-action-edge/40',
  // Filled gold — settled, done, paid. The loudest thing in a table.
  positive: 'bg-action text-on-action ring-action-edge',
  // Outlined gold — open, and waiting on somebody.
  caution: 'bg-transparent text-link ring-action-edge',
  // The one red. Reserved for failures.
  critical: 'bg-critical-50 text-critical-600 ring-critical-100',
  // Quiet outline — informational, no action implied.
  info: 'bg-transparent text-slate-600 ring-slate-300',
  gold: 'bg-success-100 text-link ring-action-edge/40',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A coloured dot plus label — lighter than a badge inside dense tables. */
export function StatusDot({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  // A dot has no room for form, so these lean on value instead: solid gold
  // for settled, a ring for open, grey for routine, red for failed.
  const dots: Record<BadgeTone, string> = {
    neutral: 'bg-slate-400',
    brand: 'bg-brand-500',
    positive: 'bg-action',
    caution: 'bg-transparent ring-2 ring-inset ring-action-edge',
    critical: 'bg-critical-500',
    info: 'bg-slate-300',
    gold: 'bg-gold-500',
  };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-700">
      <span className={cn('size-2 shrink-0 rounded-full', dots[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  hint,
  icon,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Percentage change against the previous period. */
  delta?: number | null;
  tone?: BadgeTone;
}) {
  const accents: Record<BadgeTone, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    brand: 'bg-success-50 text-link',
    positive: 'bg-positive-50 text-positive-500',
    caution: 'bg-caution-50 text-caution-500',
    critical: 'bg-critical-50 text-critical-500',
    info: 'bg-info-50 text-info-500',
    gold: 'bg-success-100 text-link',
  };

  return (
    <div className="rounded-panel border border-slate-200 bg-surface p-4 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon ? (
          <span
            className={cn('grid size-8 shrink-0 place-items-center rounded-lg', accents[tone])}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums',
              delta > 0
                ? 'bg-positive-50 text-positive-600'
                : delta < 0
                  ? 'bg-critical-50 text-critical-600'
                  : 'bg-slate-100 text-slate-500',
            )}
          >
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}
            {Math.abs(delta).toFixed(0)}%
          </span>
        ) : null}
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty / error states
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-14 text-center', className)}>
      {icon ? (
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
          {icon}
        </span>
      ) : null}
      <p className="font-semibold text-slate-800">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = 'info',
  icon,
  title,
  children,
  className,
}: {
  tone?: 'info' | 'positive' | 'caution' | 'critical';
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'border-slate-200 bg-slate-50 text-slate-700',
    positive: 'border-action-edge bg-success-50 text-success-600',
    caution: 'border-action-edge bg-transparent text-success-600',
    critical: 'border-critical-100 bg-critical-50 text-critical-600',
  };
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm', tones[tone], className)}
    >
      {icon ? <span className="mt-0.5 shrink-0 text-[1.05em]">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton
              key={column}
              className={cn('h-8 flex-1', column === 0 && 'max-w-[30%]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-panel border border-slate-200 bg-surface p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Description list — used on every detail screen
// ---------------------------------------------------------------------------

export function DescriptionList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-slate-100">{children}</dl>;
}

export function DescriptionRow({
  label,
  children,
  mono = false,
}: {
  label: ReactNode;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={cn(
          'text-right text-sm font-medium text-slate-900',
          mono && 'font-mono text-xs',
        )}
      >
        {children}
      </dd>
    </div>
  );
}
