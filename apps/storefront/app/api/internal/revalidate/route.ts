import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { fail, handleRouteError, ok } from '@tamizh/core/api';
import { forgetCatalog } from '@/services/repository';

/**
 * POST /api/internal/revalidate — server-to-server only.
 *
 * The admin panel calls this after anything that changes what the shop
 * shows: a product saved, a category moved, stock adjusted, an order
 * cancelled. The two apps run on separate hosts and share only the
 * database, so the panel cannot reach into this app's cache directly; this
 * is the seam where it asks.
 *
 * Authenticated with the same shared secret as the staff alerts, compared
 * in constant time. It carries no payload and can do exactly one thing —
 * forget the catalogue — so there is nothing to abuse beyond making the
 * next page load read the database.
 */

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const expected = process.env.INTERNAL_NOTIFY_SECRET?.trim();
    if (!expected || expected.length < 24) {
      return fail('Not configured.', 503, { code: 'not_configured' });
    }
    if (!secretMatches(request.headers.get('x-internal-secret'), expected)) {
      return fail('Not authorised.', 401, { code: 'unauthorized' });
    }
    forgetCatalog();
    return ok({ revalidated: true }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
