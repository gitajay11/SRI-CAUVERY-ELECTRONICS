'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { RefreshIcon } from '@/components/ui/Icons';

/**
 * Registers the service worker and offers a refresh when a new build is ready.
 *
 * Registration is deferred to the `load` event so it never competes with the
 * first paint. When an updated worker finishes installing, the app tells the
 * shopper rather than swapping code underneath them mid-checkout.
 */
export function ServiceWorkerRegistrar() {
  const { t } = useLocale();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        if (registration.waiting) setWaiting(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const installing = registration?.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // A worker that reaches "installed" while one is already in
            // control means this is an update, not a first install.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      } catch (error) {
        console.warn('[pwa] service worker registration failed', error);
      }
    };

    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-fade-up rounded-2xl bg-carbon-900 px-4 py-3 text-white shadow-lg sm:bottom-6">
      <div className="flex items-center gap-3">
        <RefreshIcon className="shrink-0 text-lg text-gold-300" />
        <p className="flex-1 text-sm font-medium">{t('pwa.updateAvailable')}</p>
        <button
          type="button"
          onClick={() => {
            waiting.postMessage({ type: 'SKIP_WAITING' });
            // The new worker takes control on the next navigation.
            window.location.reload();
          }}
          className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-sm font-bold text-on-action"
        >
          {t('pwa.refresh')}
        </button>
      </div>
    </div>
  );
}
