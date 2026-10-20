import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { getRepository } from '@/services/repository';

/**
 * GET /api/home — everything the mobile app's home screen shows, in one
 * request: the category tree and the same product rows as the website's home
 * page. Public and cached like the catalogue it is made of.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const repo = getRepository();
    const [categories, featured, bestSellers, newArrivals, returnGifts, bestOffers] =
      await Promise.all([
        repo.listCategoryTree(),
        repo.listFeatured(8),
        repo.listBestSellers(8),
        repo.listNewArrivals(8),
        repo.listByCategorySlug('return-gifts', 8),
        repo.listBestOffers(8),
      ]);

    return ok(
      { categories, featured, bestSellers, newArrivals, returnGifts, bestOffers },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
