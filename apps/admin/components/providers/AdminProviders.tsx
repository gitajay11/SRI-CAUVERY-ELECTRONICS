'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@tamizh/core/utils';
import type { Permission } from '@tamizh/core/permissions';
import type { StaffRole } from '@tamizh/db/enums';
import { translate, type Dictionary, type TranslationKey } from '@/i18n';
import { LOCALE_COOKIE, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';

/**
 * Client-side context for the admin shell.
 *
 * Three concerns, one provider tree so pages only wrap once:
 *   - locale, with the dictionary resolved on the server
 *   - toasts
 *   - confirmation dialogs, which every destructive action must go through
 *
 * `session` carries the viewer's permissions so the UI can hide what they
 * cannot use. That is a convenience only — the server re-checks every call.
 */

// ---------------------------------------------------------------------------
// Session + locale
// ---------------------------------------------------------------------------

export interface ClientSession {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: Permission[];
}

interface AdminContextValue {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  setLocale: (next: Locale) => void;
  session: ClientSession;
  can: (permission: Permission) => boolean;
  online: boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used inside <AdminProviders>.');
  return context;
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <AdminProviders>.');
  return context;
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** Requires the exact text to be typed. For genuinely irreversible actions. */
  typeToConfirm?: string;
  /**
   * Asks for a reason before confirming. The reason is required — an action
   * worth explaining is worth refusing without an explanation.
   */
  reasonLabel?: string;
}

/**
 * Resolves to `false` when cancelled, `true` when confirmed, or the typed
 * reason when `reasonLabel` was asked for.
 */
type ConfirmResult = boolean | string;
type ConfirmFn = (options: ConfirmOptions) => Promise<ConfirmResult>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside <AdminProviders>.');
  return context;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AdminProviders({
  locale,
  dictionary,
  session,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  session: ClientSession;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const online = useOnlineStatus();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(1);

  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: ConfirmResult) => void;
  } | null>(null);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(dictionary, key, vars),
    [dictionary],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = LOCALE_TAGS[next];
      router.refresh();
    },
    [locale, router],
  );

  const permissions = useMemo(() => new Set(session.permissions), [session.permissions]);
  const can = useCallback(
    (permission: Permission) => permissions.has(permission),
    [permissions],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextToastId.current;
    nextToastId.current += 1;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<ConfirmResult>((resolve) => {
        setConfirmState({ options, resolve });
      }),
    [],
  );

  const adminValue = useMemo<AdminContextValue>(
    () => ({ locale, t, setLocale, session, can, online }),
    [locale, t, setLocale, session, can, online],
  );

  const toastValue = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <AdminContext.Provider value={adminValue}>
      <ToastContext.Provider value={toastValue}>
        <ConfirmContext.Provider value={confirm}>
          {children}

          <div
            className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
            aria-live="polite"
          >
            {toasts.map((item) => (
              <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
            ))}
          </div>

          {confirmState ? (
            <ConfirmDialog
              options={confirmState.options}
              t={t}
              onResolve={(value) => {
                confirmState.resolve(value);
                setConfirmState(null);
              }}
            />
          ) : null}
        </ConfirmContext.Provider>
      </ToastContext.Provider>
    </AdminContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4200);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const tones: Record<ToastTone, string> = {
    success: 'bg-slate-900 text-white',
    error: 'bg-critical-600 text-white',
    info: 'bg-info-600 text-white',
  };
  const icons: Record<ToastTone, React.ReactNode> = {
    success: <CheckIcon className="text-[1.1em] text-positive-100" />,
    error: <AlertIcon className="text-[1.1em]" />,
    info: <InfoIcon className="text-[1.1em]" />,
  };

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'animate-fade-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg px-4 py-3 shadow-overlay',
        tones[toast.tone],
      )}
    >
      <span className="shrink-0">{icons[toast.tone]}</span>
      <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 rounded p-1 opacity-70 hover:opacity-100"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/**
 * Modal confirmation.
 *
 * Focus moves into the dialog and Escape cancels, so the keyboard path is the
 * same as the pointer one. Destructive actions can require the name to be
 * typed, which stops a mis-tap from deleting a product.
 */
function ConfirmDialog({
  options,
  t,
  onResolve,
}: {
  options: ConfirmOptions;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  onResolve: (value: ConfirmResult) => void;
}) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const needsTyping = Boolean(options.typeToConfirm);
  const needsReason = Boolean(options.reasonLabel);
  const canConfirm =
    (!needsTyping || typed.trim() === options.typeToConfirm) &&
    (!needsReason || reason.trim().length >= 3);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onResolve(false);
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    // Focus the safe control first: never land on "Delete".
    const target =
      needsTyping || needsReason
        ? panelRef.current?.querySelector<HTMLElement>('input, textarea')
        : confirmRef.current;
    target?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [needsTyping, needsReason, onResolve]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={options.cancelLabel ?? t('common.cancel')}
        onClick={() => onResolve(false)}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md animate-slide-up rounded-t-2xl bg-surface p-5 shadow-overlay sm:animate-fade-in sm:rounded-2xl"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
          {options.title}
        </h2>
        {options.body ? (
          <p className="mt-1.5 text-sm text-slate-600">{options.body}</p>
        ) : null}

        {needsTyping ? (
          <label className="mt-4 block">
            <span className="text-sm text-slate-600">
              Type <span className="font-mono font-semibold">{options.typeToConfirm}</span> to
              confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>
        ) : null}

        {needsReason ? (
          <label className="mt-4 block">
            <span className="text-sm text-slate-600">{options.reasonLabel}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onResolve(false)}>
            {options.cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            ref={confirmRef as never}
            variant={options.tone === 'danger' ? 'danger' : 'primary'}
            disabled={!canConfirm}
            onClick={() => onResolve(needsReason ? reason.trim() : true)}
          >
            {options.confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
