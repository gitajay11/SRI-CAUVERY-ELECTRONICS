import 'server-only';
import { db } from '@tamizh/db';
import type { AdminNotificationType, StaffRole } from '@tamizh/db/enums';
import { sendPush } from './push';

/**
 * Admin notifications.
 *
 * Two channels from one call: a row in the notification centre (durable, read
 * when someone opens the panel) and a Web Push message (immediate, reaches a
 * phone in a pocket). The row is always written; push is best-effort.
 *
 * Notification text never carries customer names, phone numbers or addresses.
 * These appear on lock screens, so an order number and an amount is the most
 * that should ever leave the building.
 */

export interface NotifyInput {
  type: AdminNotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  /** Where tapping the notification lands. */
  url?: string;
  /** Groups repeats so five low-stock alerts collapse into one. */
  tag?: string;
  /** Restricts to one role; omit to reach everyone. */
  targetRole?: StaffRole;
}

export async function notifyStaff(input: NotifyInput): Promise<void> {
  try {
    await db.adminNotification.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        targetRole: input.targetRole ?? null,
      },
    });
  } catch (error) {
    console.error('[notifications] could not record notification', error);
  }

  const settings = await db.storeSettings
    .findUnique({ where: { id: 'default' }, select: { pushNotificationsEnabled: true } })
    .catch(() => null);

  if (!settings?.pushNotificationsEnabled) return;

  // Only devices that asked for this kind of alert.
  const subscriptions = await db.pushSubscription.findMany({
    where: {
      topics: { has: input.type },
      ...(input.targetRole ? { user: { role: input.targetRole } } : {}),
      user: { isActive: true, deletedAt: null },
    },
    select: { id: true, endpoint: true, p256dh: true, auth: true, failureCount: true },
  });

  if (subscriptions.length === 0) return;

  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      const result = await sendPush(subscription, {
        title: input.title,
        body: input.body,
        url: input.url ?? '/',
        tag: input.tag,
      });
      return { subscription, result };
    }),
  );

  // Prune endpoints the push service says are dead, and give up on ones that
  // keep failing — a subscription stuck at ten failures is never coming back.
  const remove: string[] = [];
  const penalise: string[] = [];

  for (const { subscription, result } of results) {
    if (result.ok) continue;
    if (result.gone || subscription.failureCount >= 9) remove.push(subscription.id);
    else penalise.push(subscription.id);
  }

  if (remove.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: remove } } });
  }
  if (penalise.length > 0) {
    await db.pushSubscription.updateMany({
      where: { id: { in: penalise } },
      data: { failureCount: { increment: 1 } },
    });
  }

  const delivered = results.filter(({ result }) => result.ok).length;
  if (delivered > 0) {
    await db.pushSubscription.updateMany({
      where: {
        id: {
          in: results.filter(({ result }) => result.ok).map(({ subscription }) => subscription.id),
        },
      },
      data: { lastUsedAt: new Date(), failureCount: 0 },
    });
  }
}

/**
 * Raises a low-stock alert if this product has just crossed its threshold.
 *
 * Called after any stock movement. It only fires on the crossing, not on every
 * subsequent sale, so selling the last five units produces one alert rather
 * than five.
 */
export async function maybeNotifyLowStock(
  productId: string,
  stockBefore: number,
  stockAfter: number,
): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true, sku: true, lowStockThreshold: true, status: true },
  });
  if (!product || product.status !== 'ACTIVE') return;

  const threshold = product.lowStockThreshold;

  if (stockAfter <= 0 && stockBefore > 0) {
    await notifyStaff({
      type: 'OUT_OF_STOCK',
      title: 'Out of stock',
      body: `${product.name} (${product.sku}) has run out.`,
      entityType: 'Product',
      entityId: productId,
      url: `/inventory?filter=out`,
      tag: `stock-${productId}`,
    });
    return;
  }

  if (stockAfter <= threshold && stockBefore > threshold) {
    await notifyStaff({
      type: 'LOW_STOCK',
      title: 'Low stock',
      body: `${product.name} (${product.sku}) is down to ${stockAfter}.`,
      entityType: 'Product',
      entityId: productId,
      url: `/inventory?filter=low`,
      tag: `stock-${productId}`,
    });
  }
}

/**
 * The notifications this person should see.
 *
 * A notification with a `targetRole` is for that role only — a stock alert
 * aimed at the inventory manager is noise on the support desk's screen.
 */
export async function listNotifications(
  userId: string,
  role: StaffRole,
  limit = 50,
) {
  const rows = await db.adminNotification.findMany({
    where: { OR: [{ targetRole: null }, { targetRole: role }] },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    read: row.readBy.includes(userId),
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Marks notifications read for one person.
 *
 * Read state is an array of user ids on the notification rather than a row per
 * user: a shop has a handful of staff, and this avoids a join table that would
 * otherwise need cleaning up.
 */
export async function markRead(userId: string, ids?: string[]): Promise<void> {
  const where = ids?.length ? { id: { in: ids } } : {};
  const rows = await db.adminNotification.findMany({
    where: { ...where, NOT: { readBy: { has: userId } } },
    select: { id: true, readBy: true },
  });

  await Promise.all(
    rows.map((row) =>
      db.adminNotification.update({
        where: { id: row.id },
        data: { readBy: { set: [...row.readBy, userId] } },
      }),
    ),
  );
}

/** How many unread notifications this person has, for the bell badge. */
export async function unreadCount(userId: string, role: StaffRole): Promise<number> {
  return db.adminNotification.count({
    where: {
      OR: [{ targetRole: null }, { targetRole: role }],
      NOT: { readBy: { has: userId } },
    },
  });
}

/**
 * Stores a browser's push subscription.
 *
 * Keyed on the endpoint, which is what the push service issues per browser
 * install — re-subscribing on the same device updates the row instead of
 * collecting duplicates that would deliver the same alert twice.
 */
export async function saveSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
    update: {
      userId: input.userId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      failureCount: 0,
      lastUsedAt: new Date(),
    },
  });
}

/** Forgets a browser's subscription. Only ever the caller's own. */
export async function removeSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Whether this browser is already subscribed, for the toggle's initial state. */
export async function hasSubscription(
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const found = await db.pushSubscription.findFirst({
    where: { userId, endpoint },
    select: { id: true },
  });
  return found !== null;
}
