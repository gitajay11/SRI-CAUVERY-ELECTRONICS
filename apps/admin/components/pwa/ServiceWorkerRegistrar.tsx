'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/providers/AdminProviders';
import { RefreshIcon } from '@/components/ui/Icons';

/**
 * Registers the service worker and offers a refresh when a new build lands.
 *
 * Registration waits for `load` so it never competes with the first paint, and
 * an update is offered rather than applied — swapping code underneath someone
 * who is halfway through approving a refund is not acceptable.
 */
export function ServiceWorkerRegistrar() {
  const { t } = useAdmin();
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
    <div className="no-print fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-fade-in rounded-lg bg-slate-900 px-4 py-3 text-white shadow-overlay lg:bottom-6">
      <div className="flex items-center gap-3">
        <RefreshIcon className="shrink-0 text-lg text-brand-300" />
        <p className="flex-1 text-sm font-medium">{t('pwa.updateAvailable')}</p>
        <button
          type="button"
          onClick={() => {
            waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }}
          className="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold"
        >
          {t('pwa.refresh')}
        </button>
      </div>
    </div>
  );
}
