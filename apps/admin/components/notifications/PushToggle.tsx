'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, apiRequest } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Primitives';
import { BellIcon } from '@/components/ui/Icons';

/**
 * Turns push alerts on or off for *this* browser.
 *
 * A push subscription belongs to a browser install, not to a person, so the
 * state is read from the service worker registration rather than from the
 * session — the same member of staff can be subscribed on their phone and not
 * on the shop counter's desktop, which is usually what they want.
 *
 * Every failure path says plainly that alerts are off. A toggle that looks on
 * while no alert can arrive is worse than no toggle.
 */

type State = 'loading' | 'unsupported' | 'unconfigured' | 'denied' | 'on' | 'off';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalised);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output;
}

export function PushToggle() {
  const { t } = useAdmin();
  const { toast } = useToast();

  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Works out the current state without touching React state, so the effect
   * below can decide once, after the answer is known, rather than setting
   * state several times as it goes.
   */
  const resolve = useCallback(async (): Promise<State> => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return 'unsupported';
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const status = await api.get<{ configured: boolean; subscribed: boolean }>(
        `/api/admin/push${existing ? `?endpoint=${encodeURIComponent(existing.endpoint)}` : ''}`,
      );

      if (!status.configured) return 'unconfigured';
      if (Notification.permission === 'denied') return 'denied';
      return existing && status.subscribed ? 'on' : 'off';
    } catch {
      return 'off';
    }
  }, []);

  useEffect(() => {
    let current = true;
    void resolve().then((next) => {
      if (current) setState(next);
    });
    return () => {
      current = false;
    };
  }, [resolve]);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = await api.get<{ publicKey: string }>('/api/admin/push');

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      await api.post('/api/admin/push', {
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      });

      setState('on');
      toast(t('notifications.pushOn'));
    } catch (caught) {
      setState('off');
      setError(caught instanceof ApiError ? caught.message : t('notifications.pushFailed'));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Forget it on the server first: a browser that has unsubscribed but
        // is still in our table would just collect delivery failures.
        await apiRequest('/api/admin/push', {
          method: 'DELETE',
          json: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }
      setState('off');
      toast(t('notifications.pushOff'));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('notifications.pushFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <p className="text-sm text-slate-400">{t('common.loading')}</p>;
  }

  if (state === 'unsupported') {
    return <Alert tone="info">{t('notifications.pushUnsupported')}</Alert>;
  }

  if (state === 'unconfigured') {
    return <Alert tone="caution">{t('notifications.pushUnconfigured')}</Alert>;
  }

  if (state === 'denied') {
    return <Alert tone="caution">{t('notifications.pushDenied')}</Alert>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{t('notifications.pushExplain')}</p>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Button
        variant={state === 'on' ? 'outline' : 'primary'}
        loading={busy}
        onClick={() => void (state === 'on' ? disable() : enable())}
      >
        <BellIcon className="text-[1.1em]" />
        {state === 'on' ? t('notifications.pushDisable') : t('notifications.pushEnable')}
      </Button>
      <p className="text-xs text-slate-400">
        {state === 'on'
          ? t('notifications.pushOnThisDevice')
          : t('notifications.pushOffThisDevice')}
      </p>
    </div>
  );
}
