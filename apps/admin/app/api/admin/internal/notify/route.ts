import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { internalNotifySecret } from '@/lib/env';
import { notifyStaff } from '@/services/notifications';

/**
 * POST /api/admin/internal/notify — server-to-server only.
 *
 * The storefront calls this when something happens that staff should hear
 * about immediately: an order placed, a return raised. The two apps run on
 * separate hosts and share only the database, so this is the seam where the
 * shop asks the panel to raise an alert rather than reimplementing Web Push.
 *
 * Authenticated with a shared secret compared in constant time. It is a
 * machine endpoint: no session, no cookies, and it is never called from a
 * browser. The payload is deliberately narrow — a type, a short title and a
 * body — so a compromised storefront cannot use it to write arbitrary content
 * into staff notifications or to reach an arbitrary URL.
 */

const schema = z.object({
  type: z.enum(['NEW_ORDER', 'RETURN_REQUESTED', 'PAYMENT_FAILED', 'NEW_CUSTOMER']),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(1).max(160),
  entityId: z.string().trim().max(64).optional(),
  /** Restricted to a path inside the panel: never an absolute URL. */
  url: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9/_\-?=&.]*$/, 'Must be a path inside the panel')
    .optional(),
});

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const expected = internalNotifySecret();
    if (!expected) {
      return fail('Internal notifications are not configured.', 503, { code: 'not_configured' });
    }
    if (!secretMatches(request.headers.get('x-internal-secret'), expected)) {
      // Deliberately terse: an attacker learns nothing about why.
      return fail('Not authorised.', 401, { code: 'unauthorized' });
    }

    const input = schema.parse(await readJson(request));

    await notifyStaff({
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.type === 'NEW_ORDER' ? 'Order' : 'ReturnRequest',
      entityId: input.entityId,
      url: input.url ?? '/',
      tag: input.type.toLowerCase(),
    });

    return ok({ notified: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
