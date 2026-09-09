import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@tamizh/db';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireAdmin } from '@/lib/session';
import { push } from '@/lib/env';
import { saveSubscription, removeSubscription, hasSubscription } from '@/services/notifications';

/**
 * Web Push subscriptions.
 *
 * The VAPID *public* key is the only key that ever reaches a browser — that is
 * what it is for. The private key stays on the server and is never read here.
 *
 * A subscription belongs to the signed-in member of staff. There is no way to
 * subscribe on someone else's behalf: the user id comes from the session, not
 * from the request body.
 */

const ALL_TOPICS = [
  'NEW_ORDER',
  'PAYMENT_FAILED',
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'RETURN_REQUESTED',
  'REFUND_REQUESTED',
  'NEW_CUSTOMER',
  'NEW_REVIEW',
] as const;

const subscribeSchema = z.object({
  endpoint: z.string().min(20).max(600),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
  topics: z.array(z.enum(ALL_TOPICS)).max(20).optional(),
});

/** GET /api/admin/push — the public key, and whether this browser is signed up. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();
    const endpoint = new URL(request.url).searchParams.get('endpoint');

    return ok({
      configured: push.isConfigured(),
      publicKey: push.publicKey(),
      subscribed: endpoint ? await hasSubscription(identity.id, endpoint) : false,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/admin/push — subscribe this browser. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();

    if (!push.isConfigured()) {
      throw new AppError(
        'Push notifications are not configured on this server.',
        503,
        'push_unavailable',
      );
    }

    const body = subscribeSchema.parse(await readJson(request));

    await saveSubscription({
      userId: identity.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get('user-agent'),
    });

    // Everything by default: someone who turned alerts on wants alerts. The
    // list can be narrowed later without re-subscribing the device.
    await db.pushSubscription.update({
      where: { endpoint: body.endpoint },
      data: { topics: body.topics ?? [...ALL_TOPICS] },
    });

    return ok({ subscribed: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/push — unsubscribe this browser. */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();
    const { endpoint } = z
      .object({ endpoint: z.string().min(20).max(600) })
      .parse(await readJson(request));

    await removeSubscription(identity.id, endpoint);
    return ok({ subscribed: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
