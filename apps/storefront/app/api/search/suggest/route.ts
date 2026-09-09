import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { getRepository } from '@/services/repository';

/**
 * GET /api/search/suggest?q= — type-ahead results for the search box.
 *
 * Capped at six products: the panel has to stay usable on a phone keyboard,
 * and the full result set is one Enter key away.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'suggest'), LIMITS.search);
    const term = new URL(request.url).searchParams.get('q')?.trim() ?? '';

    if (term.length < 2) return ok({ products: [] });

    const products = await getRepository().suggest(term.slice(0, 120), 6);
    return ok({ products }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
