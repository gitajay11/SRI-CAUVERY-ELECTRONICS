import { NextResponse } from 'next/server';
import { handleRouteError, notFound, ok } from '@tamizh/core/api';
import { getRepository } from '@/services/repository';

/**
 * GET /api/products/:slug — one product, as its page shows it, with the
 * products shown beside it. Public: whether the shopper may review it is a
 * separate, personal question and is not answered here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    const repo = getRepository();

    const product = await repo.getProductBySlug(slug);
    if (!product) throw notFound('That product is no longer available.');

    const related = await repo.listRelated(product.id, 8);

    return ok(
      { product, related },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
