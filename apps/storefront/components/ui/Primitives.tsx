import type { ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { StarIcon } from './Icons';

/** Small presentational pieces used across the storefront. */

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type BadgeTone = 'brand' | 'gold' | 'neutral' | 'success' | 'danger' | 'warning';

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-success-50 text-link ring-action-edge/40',
  gold: 'bg-success-100 text-link ring-action-edge/40',
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  success: 'bg-success-50 text-success-500 ring-success-500/20',
  danger: 'bg-danger-50 text-danger-600 ring-danger-500/20',
  warning: 'bg-warning-50 text-warning-500 ring-warning-500/20',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------

export function StarRating({
  value,
  count,
  size = 'sm',
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  const starSize = size === 'md' ? 'text-lg' : 'text-sm';

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('inline-flex text-gold-500', starSize)}
        role="img"
        aria-label={`${value.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((position) => (
          <StarIcon
            key={position}
            filled={rounded >= position}
            half={rounded === position - 0.5}
            className={rounded >= position - 0.5 ? '' : 'text-ink-300'}
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-xs font-semibold text-ink-600">{value.toFixed(1)}</span>
      ) : null}
      {count !== undefined ? (
        <span className="text-xs text-ink-400">({count})</span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

export function SectionHeading({
  title,
  subtitle,
  action,
  as: Tag = 'h2',
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4 sm:mb-6', className)}>
      <div className="min-w-0">
        <Tag className="text-xl font-bold text-ink-900 sm:text-2xl">{title}</Tag>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-500 sm:text-[0.95rem]">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
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
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-surface/60 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-success-50 text-2xl text-brand-500">
          {icon}
        </span>
      ) : null}
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-ink-500">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-ink-100 bg-surface">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-3.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export function Alert({
  tone = 'brand',
  icon,
  children,
  className,
}: {
  tone?: 'brand' | 'warning' | 'danger' | 'success';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: 'border-action-edge/40 bg-success-50 text-link',
    warning: 'border-warning-500/25 bg-warning-50 text-warning-500',
    danger: 'border-danger-500/25 bg-danger-50 text-danger-600',
    success: 'border-success-500/25 bg-success-50 text-success-500',
  };
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium',
        tones[tone],
        className,
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0 text-[1.1em]">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
