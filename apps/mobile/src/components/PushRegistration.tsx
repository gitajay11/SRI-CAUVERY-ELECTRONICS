import { router } from 'expo-router';
import { useEffect } from 'react';
import type { NotificationResponse } from 'expo-notifications';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { loadNotifications, registerForOrderUpdates } from '@/lib/notifications';

/**
 * Keeps this phone registered for order updates, and opens the order a
 * notification is about when it is tapped. Renders nothing, and does nothing
 * at all in builds that cannot receive pushes (Expo Go among them).
 *
 * Registration here never asks for permission — that is asked once, after an
 * order, where the reason is plain. It only renews a registration the shopper
 * already agreed to: at sign-in, at start-up, and when the language changes
 * (so the next message arrives in it).
 */
export function PushRegistration() {
  const { user } = useAuth();
  const { locale } = useLocale();

  useEffect(() => {
    if (user) void registerForOrderUpdates(locale, false);
  }, [user, locale]);

  // Taps on notifications — including the one that launched the app.
  useEffect(() => {
    const loading = loadNotifications();
    if (!loading) return;

    let handled: string | null = null;
    const open = (response: NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled === id) return;
      handled = id;
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/order/')) router.push(url as never);
    };

    let remove: (() => void) | undefined;
    let cancelled = false;
    void loading.then(async (Notifications) => {
      if (cancelled) return;
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) open(response);
      });
      remove = () => subscription.remove();
      open(await Notifications.getLastNotificationResponseAsync());
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  return null;
}
