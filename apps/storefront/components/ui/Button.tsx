import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { SpinnerIcon } from './Icons';

/**
 * Button styles shared by `<button>` and `<Link>`.
 *
 * All sizes clear the 44px touch target on mobile, which is the single biggest
 * usability lever on a phone-first storefront.
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'gold'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-[background-color,color,box-shadow,transform] duration-200 ' +
  'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 ' +
  'select-none whitespace-nowrap';

/**
 * The hierarchy is gold, then bronze, then outline, then nothing — and only
 * the first is filled with the metal, so a screen has one obvious next step.
 *
 * The primary label is carbon, never white: gold with white on it is the one
 * pairing this palette does not make, because it is the one that fails to
 * read.
 */
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-action text-on-action shadow-sm hover:bg-action-hover hover:shadow-md focus-visible:outline-action-edge',
  secondary:
    'border border-action-edge/35 bg-success-50 text-success-600 hover:border-action-edge/60',
  ghost: 'text-ink-700 hover:bg-ink-100/80',
  outline:
    'border border-ink-300 bg-surface text-ink-800 hover:border-action-edge hover:text-link',
  gold: 'bg-action text-on-action shadow-sm hover:bg-action-hover hover:shadow-md',
  danger: 'bg-danger-solid text-white hover:bg-danger-solid-hover',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-sm',
  md: 'min-h-11 px-5 text-[0.95rem]',
  lg: 'min-h-12 px-6 text-base sm:min-h-13 sm:px-7',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
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
}: CommonProps & ComponentProps<'button'>) {
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
}: Omit<CommonProps, 'loading'> & ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={buttonClass(variant, size, cn(fullWidth && 'w-full', className))}
    >
      {children}
    </Link>
  );
}
