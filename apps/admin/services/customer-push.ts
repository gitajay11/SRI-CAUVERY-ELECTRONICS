import 'server-only';
import { after } from 'next/server';
import { db } from '@tamizh/db';
import type { OrderStatus } from '@tamizh/db/enums';

/**
 * Tells a shopper's phones when their order moves.
 *
 * The mobile app registers an Expo push token per phone (CustomerPushToken);
 * this sends through Expo's push service, which relays to Apple and Google.
 * It runs after the response that made the change has gone, so a slow or
 * unreachable push service never holds up the panel, and a failure costs a
 * missed notification — the order itself is already saved.
 *
 * EXPO_ACCESS_TOKEN is optional: set it only if push security is turned on
 * for the project at expo.dev.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Locale = 'en' | 'ta';

/** The changes a shopper wants to hear about; the rest stay in the app. */
const STATUS_TEXT: Partial<Record<OrderStatus, Record<Locale, string>>> = {
  CONFIRMED: { en: 'Confirmed', ta: 'உறுதி செய்யப்பட்டது' },
  SHIPPED: { en: 'Shipped', ta: 'அனுப்பப்பட்டது' },
  OUT_FOR_DELIVERY: { en: 'Out for delivery', ta: 'டெலிவரிக்குப் புறப்பட்டது' },
  DELIVERED: { en: 'Delivered', ta: 'வழங்கப்பட்டது' },
  CANCELLED: { en: 'Cancelled', ta: 'ரத்து செய்யப்பட்டது' },
  RETURNED: { en: 'Returned', ta: 'திரும்பப் பெறப்பட்டது' },
  REFUNDED: { en: 'Refunded', ta: 'பணம் திரும்ப வழங்கப்பட்டது' },
};

export type OrderUpdate =
  | { kind: 'status'; status: OrderStatus }
  | { kind: 'cancellation-declined' };

function message(update: OrderUpdate, orderNumber: string, locale: Locale) {
  if (update.kind === 'cancellation-declined') {
    return locale === 'ta'
      ? {
          title: `ஆர்டர் ${orderNumber}`,
          body: 'ரத்து கோரிக்கை ஏற்கப்படவில்லை. விவரங்களுக்கு ஆர்டரைப் பார்க்கவும்.',
        }
      : {
          title: `Order ${orderNumber}`,
          body: 'Your cancellation request was declined. Open the order for details.',
        };
  }
  const status = STATUS_TEXT[update.status]?.[locale];
  if (!status) return null;
  return locale === 'ta'
    ? { title: `ஆர்டர் ${orderNumber}`, body: `உங்கள் ஆர்டர் நிலை: ${status}` }
    : { title: `Order ${orderNumber}`, body: `Your order is now ${status.toLowerCase()}.` };
}

/** Whether this change is one the shopper is told about. */
export function isNotifiable(update: OrderUpdate): boolean {
  return update.kind !== 'status' || update.status in STATUS_TEXT;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Queues the notification for after the response. Safe to call for any
 * change: orders placed as a guest, accounts with no phone registered and
 * statuses not worth a notification all simply send nothing.
 */
export function notifyCustomerAboutOrder(orderNumber: string, update: OrderUpdate): void {
  if (!isNotifiable(update)) return;
  after(async () => {
    try {
      await send(orderNumber, update);
    } catch (error) {
      console.warn('[customer-push] could not notify', orderNumber, error);
    }
  });
}

async function send(orderNumber: string, update: OrderUpdate): Promise<void> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { userId: true },
  });
  if (!order?.userId) return;

  const tokens = await db.customerPushToken.findMany({
    where: { userId: order.userId },
    select: { token: true, locale: true },
  });
  if (tokens.length === 0) return;

  const messages = tokens.flatMap(({ token, locale }) => {
    const text = message(update, orderNumber, locale === 'ta' ? 'ta' : 'en');
    if (!text) return [];
    return [
      {
        to: token,
        title: text.title,
        body: text.body,
        sound: 'default',
        priority: 'high',
        channelId: 'orders',
        // The app opens this screen when the notification is tapped.
        data: { url: `/order/${orderNumber}` },
      },
    ];
  });
  if (messages.length === 0) return;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // Expo takes up to 100 messages per request; an account has a handful of phones.
  for (let start = 0; start < messages.length; start += 100) {
    const batch = messages.slice(start, start + 100);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[customer-push] Expo answered ${response.status}`);
      continue;
    }

    // Tickets come back in the order the messages went. A phone that has
    // uninstalled the app will never take another notification: forget it.
    const { data } = (await response.json()) as { data?: ExpoTicket[] };
    const gone = (data ?? [])
      .map((ticket, index) => (ticket.details?.error === 'DeviceNotRegistered' ? batch[index]?.to : null))
      .filter((token): token is string => Boolean(token));
    if (gone.length > 0) {
      await db.customerPushToken.deleteMany({ where: { token: { in: gone } } });
    }
  }
}
