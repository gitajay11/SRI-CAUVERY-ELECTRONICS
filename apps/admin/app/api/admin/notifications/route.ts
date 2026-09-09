import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireAdmin } from '@/lib/session';
import { listNotifications, markRead, unreadCount } from '@/services/notifications';

/** GET /api/admin/notifications — this person's notifications. */
export async function GET(): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();
    const [items, unread] = await Promise.all([
      listNotifications(identity.id, identity.role, 30),
      unreadCount(identity.id, identity.role),
    ]);
    return ok({ items, unread });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/admin/notifications — mark as read.
 *
 * Read state is per person: marking one read here never hides it from another
 * member of staff who has not seen it.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();
    const { ids } = z
      .object({ ids: z.array(z.string().max(64)).max(100).optional() })
      .parse(await readJson(request));

    await markRead(identity.id, ids);
    return ok({ unread: await unreadCount(identity.id, identity.role) });
  } catch (error) {
    return handleRouteError(error);
  }
}
