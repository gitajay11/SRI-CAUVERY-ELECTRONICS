import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { parseProductSearchParams } from '@/lib/product-query';
import { getRepository } from '@/services/repository';

/**
 * GET /api/products — the same faceted search the shop grid uses.
 *
 * Public and cacheable at the edge for a short window: the catalogue is not
 * personal, and stock changes are reflected within a minute.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'products'), LIMITS.search);
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const result = await getRepository().searchProducts(
      parseProductSearchParams(params),
    );
    return ok(result, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
