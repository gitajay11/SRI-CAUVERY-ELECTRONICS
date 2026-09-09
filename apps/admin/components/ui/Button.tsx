import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { SpinnerIcon } from './Icons';

/**
 * Buttons.
 *
 * Every size clears a 44px touch target — staff use this on a phone at the
 * counter, not only at a desk. `danger` is reserved for actions that destroy
 * or refund; anything using it should also confirm first.
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'dangerGhost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold ' +
  'transition-[background-color,color,border-color,box-shadow] duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'bg-slate-800 text-white hover:bg-slate-900',
  outline:
    'border border-slate-300 bg-surface text-slate-700 hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-critical-500 text-white hover:bg-critical-600',
  dangerGhost:
    'border border-critical-500/30 bg-critical-50 text-critical-600 hover:bg-critical-100',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-[0.95rem]',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: Common & { loading?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, cn(fullWidth && 'w-full', className))}
    >
      {loading ? <SpinnerIcon className="text-[1.1em]" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={buttonClass(variant, size, cn(fullWidth && 'w-full', className))}
    >
      {children}
    </Link>
  );
}

/** Square icon-only control. `label` becomes the accessible name. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  className,
  children,
  ...props
}: {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
} & ComponentProps<'button'>) {
  const box = size === 'sm' ? 'size-9 text-base' : size === 'lg' ? 'size-12 text-xl' : 'size-11 text-lg';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cn(base, variants[variant], 'rounded-lg p-0', box, className)}
    >
      {children}
    </button>
  );
}
