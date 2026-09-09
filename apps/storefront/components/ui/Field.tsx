'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { AlertIcon, ChevronDownIcon } from './Icons';

/**
 * Accessible form controls.
 *
 * Every field wires up label/description/error with real ids so screen readers
 * announce the error text, and `aria-invalid` drives the red state instead of
 * a separate prop that can drift out of sync.
 */

// Chrome only — no sizing, so the compact select below can borrow it. `cn`
// is a plain join rather than a Tailwind merger, so conflicting utilities both
// apply instead of resolving; sizes are composed, never overridden.
const controlChrome =
  'border bg-surface text-ink-900 ' +
  'placeholder:text-ink-400 transition-colors duration-150 ' +
  'border-ink-200 hover:border-ink-300 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 ' +
  'aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-500/12 ' +
  'disabled:bg-ink-50 disabled:text-ink-400';

const controlBase = 'w-full rounded-xl px-3.5 py-3 text-base ' + controlChrome;

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

export function FieldShell({
  label,
  hint,
  error,
  required,
  optionalLabel,
  children,
}: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-700">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger-500" aria-hidden="true">
            *
          </span>
        ) : optionalLabel ? (
          <span className="ml-1.5 font-normal text-ink-400">({optionalLabel})</span>
        ) : null}
      </label>

      {children({ id, describedBy })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-sm font-medium text-danger-500"
        >
          <AlertIcon className="shrink-0 text-[1.05em]" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
};

export function TextField({
  label,
  hint,
  error,
  optionalLabel,
  className,
  required,
  ...props
}: InputProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
    >
      {({ id, describedBy }) => (
        <input
          {...props}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, className)}
        />
      )}
    </FieldShell>
  );
}

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
};

export function TextAreaField({
  label,
  hint,
  error,
  optionalLabel,
  className,
  required,
  ...props
}: TextAreaProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
    >
      {({ id, describedBy }) => (
        <textarea
          rows={4}
          {...props}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, 'resize-y', className)}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<ComponentProps<'select'>, 'id' | 'size'> & {
  label: string;
  hint?: string;
  error?: string;
};

/**
 * The one dropdown.
 *
 * A native `<select>`, because on a phone the platform picker beats anything
 * built out of divs — it scrolls under one thumb, it types ahead, and it never
 * traps focus. Only the closed control is styled: the chevron is a real
 * element inheriting `currentColor` rather than an SVG baked into a
 * background image, so it follows the theme instead of staying grey when the
 * shop goes dark.
 *
 * The open option list is drawn by the operating system and cannot be styled;
 * it follows `color-scheme`, which the theme sets on the document — which is
 * why a dark shop gets a dark option list for free.
 */
export function Select({
  size = 'md',
  invalid,
  leadingIcon,
  className,
  children,
  ...props
}: Omit<ComponentProps<'select'>, 'size'> & {
  size?: 'md' | 'sm' | 'xs';
  invalid?: boolean;
  /** Sits in the start gutter; the component reserves the room for it. */
  leadingIcon?: ReactNode;
}) {
  const leading = leadingIcon
    ? { md: 'ps-11', sm: 'ps-10', xs: 'ps-8' }[size]
    : { md: 'ps-3.5', sm: 'ps-4', xs: 'ps-2.5' }[size];

  return (
    <span className={cn('relative inline-flex', size === 'md' && 'w-full')}>
      {leadingIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 my-auto flex items-center text-ink-400',
            size === 'xs' ? 'start-2 text-sm' : size === 'md' ? 'start-3.5 text-lg' : 'start-3.5 text-base',
          )}
        >
          {leadingIcon}
        </span>
      ) : null}

      <select
        {...props}
        aria-invalid={invalid ? true : props['aria-invalid']}
        className={cn(
          'cursor-pointer appearance-none',
          controlChrome,
          {
            md: 'w-full rounded-xl py-3 pe-11 text-base',
            sm: 'min-h-11 rounded-full py-2 pe-9 text-sm font-semibold',
            xs: 'min-h-9 rounded-lg py-1 pe-7 text-sm',
          }[size],
          leading,
          className,
        )}
      >
        {children}
      </select>

      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 my-auto text-ink-400',
          size === 'xs' ? 'end-1.5 text-sm' : size === 'md' ? 'end-3.5 text-lg' : 'end-3 text-base',
        )}
      />
    </span>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  required,
  children,
  ...props
}: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <Select
          {...props}
          id={id}
          required={required}
          invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={className}
        >
          {children}
        </Select>
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        {...props}
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-ink-300 text-link',
          'accent-brand-600 focus-visible:outline-brand-600',
          className,
        )}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-ink-700">
        <span className="font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-ink-500">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

/** Form-level error summary shown above the submit button. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger-500/25 bg-danger-50 px-3.5 py-3 text-sm font-medium text-danger-600"
    >
      <AlertIcon className="mt-0.5 shrink-0 text-[1.1em]" />
      <span>{children}</span>
    </p>
  );
}
