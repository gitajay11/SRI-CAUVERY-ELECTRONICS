'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { AlertIcon } from './Icons';

/**
 * Accessible form controls.
 *
 * Every field wires up label/description/error with real ids so screen readers
 * announce the error text, and `aria-invalid` drives the red state instead of
 * a separate prop that can drift out of sync.
 */

const controlBase =
  'w-full rounded-xl border bg-surface px-3.5 py-3 text-base text-ink-900 ' +
  'placeholder:text-ink-400 transition-colors duration-150 ' +
  'border-ink-200 hover:border-ink-300 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 ' +
  'aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-500/12 ' +
  'disabled:bg-ink-50 disabled:text-ink-400';

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

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
};

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
        <select
          {...props}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, 'appearance-none pr-10', className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b655b' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m5 9 7 7 7-7'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.85rem center',
            backgroundSize: '1.1rem',
          }}
        >
          {children}
        </select>
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
          'mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-ink-300 text-brand-600',
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
