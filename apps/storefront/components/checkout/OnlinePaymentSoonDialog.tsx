'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button, buttonClass } from '@/components/ui/Button';
import { CloseIcon, PhoneIcon, ShieldIcon } from '@/components/ui/Icons';

/**
 * "Online payment coming soon" — what the Pay online option opens while the
 * shop takes no payment online.
 *
 * A real dialog rather than `alert()`: it offers the way forward (pay at the
 * store or on delivery, or call), traps focus while open, closes on Escape,
 * on the X and on a tap outside, and hands focus back to the button that
 * opened it.
 *
 * Portalled onto `document.body` so no ancestor with a backdrop filter or a
 * transform can become the containing block of its fixed overlay.
 */
export function OnlinePaymentSoonDialog({
  open,
  onClose,
  onChooseCod,
  returnFocusRef,
  phone,
}: {
  open: boolean;
  onClose: () => void;
  onChooseCod: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  phone: string;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // The latest onClose, without making the effect below re-run (and steal
  // focus back to the first button) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trigger = returnFocusRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    primaryRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      {/* Pointer-only: keyboard users have Escape and the close button. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-carbon-950/45 backdrop-blur-sm"
        style={{ animation: 'te-fade-up 0.2s var(--ease-out-soft) both' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative w-full max-w-sm rounded-card border border-ink-100/70 bg-surface/80 p-5 shadow-overlay backdrop-blur-xl backdrop-saturate-150 sm:p-6"
        style={{
          animation: 'te-fade-up 0.24s var(--ease-out-soft) both',
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-2.5 top-2.5 grid size-11 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
        >
          <CloseIcon className="text-xl" />
        </button>

        <span className="grid size-11 place-items-center rounded-full bg-success-50 text-xl text-link">
          <ShieldIcon />
        </span>
        <h2 id={titleId} className="mt-3 pr-8 text-lg font-extrabold text-ink-900">
          {t('checkout.online.title')}
        </h2>
        <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-ink-600">
          {t('checkout.online.body')}
        </p>

        <div className="mt-5 grid gap-2.5">
          <Button ref={primaryRef} onClick={onChooseCod} fullWidth className="whitespace-normal">
            {t('checkout.online.payAtStore')}
          </Button>
          <a href={`tel:${phone.replace(/\s/g, '')}`} className={buttonClass('outline', 'md', 'w-full')}>
            <PhoneIcon className="text-base" />
            {t('checkout.online.call')}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
