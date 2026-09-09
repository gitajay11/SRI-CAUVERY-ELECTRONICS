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
import Link from 'next/link';
import { cn } from '@tamizh/core/utils';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from '@/components/ui/Icons';

/**
 * Toasts.
 *
 * Used for the small confirmations that would otherwise need a full page
 * change — "added to cart", "saved to wishlist", "coupon applied" — and for
 * surfacing API errors that are not attached to a specific field.
 *
 * The live region is polite for success and assertive for errors, so a screen
 * reader interrupts only when something actually went wrong.
 */

export type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; href: string };
}

interface ToastContextValue {
  toast: (
    message: string,
    options?: { tone?: ToastTone; action?: { label: string; href: string } },
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>((message, options) => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((current) => [
      // Never stack more than three; older ones fall off the top.
      ...current.slice(-2),
      { id, message, tone: options?.tone ?? 'success', action: options?.action },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  // Toasts float over the page, so every ground here is an absolute one: a
  // theme-relative dark would turn near-white in dark mode and take the white
  // label with it.
  const tones: Record<ToastTone, string> = {
    success: 'bg-carbon-900 text-white',
    error: 'bg-danger-solid-hover text-white',
    info: 'bg-brand-700 text-white',
  };

  const icons: Record<ToastTone, React.ReactNode> = {
    success: <CheckIcon className="text-[1.15em] text-gold-300" />,
    error: <AlertIcon className="text-[1.15em]" />,
    info: <InfoIcon className="text-[1.15em]" />,
  };

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'animate-fade-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 shadow-lg',
        tones[toast.tone],
      )}
    >
      <span className="shrink-0">{icons[toast.tone]}</span>
      <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
      {toast.action ? (
        <Link
          href={toast.action.href}
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
        >
          {toast.action.label}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 shrink-0 rounded-full p-1.5 text-lg opacity-70 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
