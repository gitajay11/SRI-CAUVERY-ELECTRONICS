'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@tamizh/core/utils';
import { AlertIcon, ChevronDownIcon, EyeIcon, EyeOffIcon } from './Icons';

/**
 * Form controls.
 *
 * Every field wires label, hint and error together with real ids, so a screen
 * reader announces the error with the input. `aria-invalid` drives the red
 * state rather than a separate prop that can drift out of sync with it.
 */

// Chrome only — no sizing, so the compact select below can borrow it.
const controlChrome =
  'border bg-surface text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors duration-150 ' +
  'border-slate-300 hover:border-slate-400 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 ' +
  'aria-[invalid=true]:border-critical-500 aria-[invalid=true]:ring-critical-500/15 ' +
  'disabled:bg-slate-50 disabled:text-slate-400 read-only:bg-slate-50';

// `min-h-11` keeps every control at a 44px touch target, which is what a
// thumb needs on the shop counter's phone.
const control = 'w-full min-h-11 rounded-lg px-3 py-2.5 text-sm ' + controlChrome;

interface ShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  /** Rendered to the right of the label — units, a helper action. */
  aside?: ReactNode;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

export function FieldShell({
  label,
  hint,
  error,
  required,
  optionalLabel,
  aside,
  children,
}: ShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {required ? (
            <span className="ml-0.5 text-critical-500" aria-hidden="true">
              *
            </span>
          ) : optionalLabel ? (
            <span className="ml-1.5 font-normal text-slate-400">({optionalLabel})</span>
          ) : null}
        </label>
        {aside ? <span className="text-xs text-slate-500">{aside}</span> : null}
      </div>

      {children({ id, describedBy })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-sm font-medium text-critical-600"
        >
          <AlertIcon className="shrink-0 text-[1.05em]" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldExtras = {
  label: string;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: string;
  aside?: ReactNode;
};

export function TextField({
  label,
  hint,
  error,
  optionalLabel,
  aside,
  className,
  required,
  ...props
}: FieldExtras & Omit<ComponentProps<'input'>, 'id'>) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      aside={aside}
    >
      {({ id, describedBy }) => (
        <input
          {...props}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(control, className)}
        />
      )}
    </FieldShell>
  );
}

/**
 * A password field that can be read back.
 *
 * Two small things, both of which exist because of how sign-in actually fails:
 * a reveal toggle, because a mistyped password on a phone keyboard is the
 * commonest reason staff cannot get in; and a Caps Lock warning, because the
 * second commonest reason is invisible until it has already failed. The toggle
 * defaults to hidden and never persists — it is for checking, not for leaving
 * a password on screen at the counter.
 */
export function PasswordField({
  label,
  hint,
  error,
  aside,
  className,
  required,
  revealLabel,
  hideLabel,
  capsLockLabel,
  ...props
}: FieldExtras &
  Omit<ComponentProps<'input'>, 'id' | 'type'> & {
    revealLabel: string;
    hideLabel: string;
    capsLockLabel: string;
  }) {
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const noteCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // `getModifierState` is undefined on some soft keyboards; treat that as
    // "cannot tell" and say nothing rather than guessing wrong.
    setCapsLock(event.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      aside={aside}
    >
      {({ id, describedBy }) => (
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <input
              {...props}
              id={id}
              type={revealed ? 'text' : 'password'}
              required={required}
              onKeyUp={noteCapsLock}
              onKeyDown={noteCapsLock}
              onBlur={(event) => {
                setCapsLock(false);
                props.onBlur?.(event);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={cn(control, 'pe-12', className)}
            />
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              aria-label={revealed ? hideLabel : revealLabel}
              aria-pressed={revealed}
              className="absolute inset-y-0 end-1 my-auto grid size-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              {revealed ? <EyeOffIcon className="text-lg" /> : <EyeIcon className="text-lg" />}
            </button>
          </div>

          {capsLock ? (
            <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-link">
              <AlertIcon className="shrink-0 text-[1.05em]" />
              {capsLockLabel}
            </p>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

/** A money input that shows the rupee sign and keeps the numeric keypad. */
export function MoneyField({
  label,
  hint,
  error,
  optionalLabel,
  aside,
  className,
  required,
  ...props
}: FieldExtras & Omit<ComponentProps<'input'>, 'id' | 'type'>) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      aside={aside}
    >
      {({ id, describedBy }) => (
        <div className="relative">
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400"
            aria-hidden="true"
          >
            ₹
          </span>
          <input
            {...props}
            id={id}
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(control, 'pl-7 tabular-nums', className)}
          />
        </div>
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optionalLabel,
  className,
  required,
  ...props
}: FieldExtras & Omit<ComponentProps<'textarea'>, 'id'>) {
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
          className={cn(control, 'resize-y', className)}
        />
      )}
    </FieldShell>
  );
}

/**
 * The one dropdown.
 *
 * A native `<select>`, because on a phone the platform picker beats anything
 * that could be built out of divs — it is scrollable with one thumb, it types
 * ahead, and it never traps focus. What is styled is only the closed control:
 * the chevron is a real element inheriting `currentColor` rather than a
 * hard-coded SVG in a background image, so it follows the theme instead of
 * staying grey when the panel goes dark.
 *
 * The open option list is drawn by the operating system and cannot be styled
 * at all; it follows `color-scheme`, which the theme sets on the document —
 * which is why a dark panel gets a dark option list for free.
 */
export function Select({
  size = 'md',
  invalid,
  className,
  children,
  ...props
}: Omit<ComponentProps<'select'>, 'size'> & {
  size?: 'md' | 'sm';
  invalid?: boolean;
}) {
  return (
    <span className={cn('relative inline-flex', size === 'md' && 'w-full')}>
      <select
        {...props}
        aria-invalid={invalid ? true : props['aria-invalid']}
        className={cn(
          'cursor-pointer appearance-none',
          controlChrome,
          size === 'md'
            ? 'min-h-11 w-full rounded-lg py-2.5 pe-9 ps-3 text-sm'
            : 'min-h-10 rounded-lg py-1.5 pe-8 ps-3 text-sm font-medium',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 my-auto text-slate-400',
          size === 'md' ? 'end-3 text-base' : 'end-2.5 text-sm',
        )}
      />
    </span>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optionalLabel,
  className,
  required,
  children,
  ...props
}: FieldExtras & Omit<ComponentProps<'select'>, 'id' | 'size'>) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
    >
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
    <div className="flex items-start gap-2.5">
      <input
        {...props}
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600',
          className,
        )}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-slate-700">
        <span className="font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

/** A row of mutually exclusive choices, easier to hit than a select on touch. */
export function RadioCards<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; description?: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">{label}</legend>
      <div
        className={cn(
          'grid gap-2',
          columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors',
              value === option.value
                ? 'border-brand-500 bg-success-50'
                : 'border-slate-300 hover:border-slate-400',
            )}
          >
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 accent-brand-600"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium text-slate-900">
                {option.icon}
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-slate-500">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Form-level error summary, shown above the submit button. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-critical-100 bg-critical-50 px-3.5 py-2.5 text-sm font-medium text-critical-600"
    >
      <AlertIcon className="mt-0.5 shrink-0 text-[1.05em]" />
      <span>{children}</span>
    </p>
  );
}

/** Groups related fields inside a Panel. */
export function FieldGroup({
  title,
  description,
  columns = 2,
  children,
}: {
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <div>
      {title ? (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          'grid gap-4',
          columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {children}
      </div>
    </div>
  );
}
