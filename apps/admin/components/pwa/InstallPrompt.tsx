'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/providers/AdminProviders';
import { AdminMark } from '@/components/layout/AdminMark';
import { CloseIcon, UploadIcon } from '@/components/ui/Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'te_admin_install_dismissed_at';
const DISMISS_DAYS = 30;

/**
 * "Add to home screen".
 *
 * Installing genuinely matters here: an installed admin app can receive push
 * notifications about new orders, which is the whole reason a shop owner wants
 * this on their phone. The browser's own mini-infobar is captured and re-offered
 * at a calmer moment, and a dismissal is remembered for a month.
 */
export function InstallPrompt() {
  const { t } = useAdmin();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const recentlyDismissed = () => {
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        return raw ? Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000 : false;
      } catch {
        return false;
      }
    };

    const onPrompt = (nativeEvent: Event) => {
      nativeEvent.preventDefault();
      if (recentlyDismissed()) return;
      setEvent(nativeEvent as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 10_000);
    };
    const onInstalled = () => {
      setVisible(false);
      setEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage blocked; the prompt simply reappears next session.
    }
  };

  if (!visible || !event) return null;

  return (
    <div
      role="dialog"
      aria-label={t('pwa.installTitle')}
      className="no-print fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-slide-up rounded-xl border border-slate-200 bg-surface p-4 shadow-overlay lg:bottom-6"
    >
      <div className="flex items-start gap-3">
        <AdminMark className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{t('pwa.installTitle')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {t('pwa.installBody')}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close')}
          className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600"
        >
          {t('pwa.notNow')}
        </button>
        <button
          type="button"
          onClick={async () => {
            await event.prompt();
            const choice = await event.userChoice;
            if (choice.outcome === 'dismissed') dismiss();
            else setVisible(false);
            setEvent(null);
          }}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white"
        >
          <UploadIcon className="text-base" />
          {t('pwa.install')}
        </button>
      </div>
    </div>
  );
}
