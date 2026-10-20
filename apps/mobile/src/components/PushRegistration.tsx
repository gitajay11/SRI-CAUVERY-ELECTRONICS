import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { registerForOrderUpdates } from '@/lib/notifications';

/**
 * Keeps this phone registered for order updates, and opens the order a
 * notification is about when it is tapped. Renders nothing.
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

  // A tap on a notification — including the one that launched the app.
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/order/')) {
      router.push(url as never);
    }
  }, [response]);

  return null;
}
