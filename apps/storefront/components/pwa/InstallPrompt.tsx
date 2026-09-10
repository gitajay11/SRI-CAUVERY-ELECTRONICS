'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { BrandGlyph } from '@/components/layout/BrandMark';
import { CloseIcon, DownloadIcon } from '@/components/ui/Icons';
import { useInstall } from './InstallProvider';

/**
 * "Add to home screen" prompt.
 *
 * The event itself is captured by InstallProvider, because it fires once and
 * whoever listens at that instant owns the only chance to install — the menu
 * needs to be able to offer the same thing. This is the unprompted half: it
 * waits for a calmer moment than the browser's own mini-infobar, and a
 * dismissal is remembered for 30 days so the shop never nags.
 */

const DISMISS_KEY = 'te_install_dismissed_at';
const DISMISS_DAYS = 30;
const SHOW_AFTER_MS = 12_000;

export function InstallPrompt() {
  const { t } = useLocale();
  const { platform, install } = useInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only the browser-prompt path is offered unasked. On iOS the menu's
    // explicit "Install app" is the right place for instructions; a banner of
    // steps nobody requested is just an advertisement.
    if (platform !== 'prompt') return;

    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw && Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000) return;
    } catch {
      // Storage unavailable — offer it; the worst case is one extra prompt.
    }

    // Let the shopper look around first; a prompt on arrival gets dismissed.
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [platform]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable — the prompt simply reappears next session.
    }
  };

  if (!visible || platform !== 'prompt') return null;

  return (
    <div
      role="dialog"
      aria-label={t('pwa.installTitle')}
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-ink-100 bg-surface p-4 shadow-card-hover sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <BrandGlyph className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">{t('pwa.installTitle')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
            {t('pwa.installBody')}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close')}
          className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-100"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="min-h-10 flex-1 rounded-full border border-ink-200 px-4 text-sm font-semibold text-ink-600"
        >
          {t('pwa.notNow')}
        </button>
        <button
          type="button"
          onClick={async () => {
            const outcome = await install();
            if (outcome === 'dismissed') dismiss();
            else setVisible(false);
          }}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-bold text-white"
        >
          <DownloadIcon className="text-base" />
          {t('pwa.install')}
        </button>
      </div>
    </div>
  );
}
