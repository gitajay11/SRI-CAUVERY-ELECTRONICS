import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { getRepository } from '@/services/repository';

/** GET /api/categories — the two-level category tree with product counts. */
export async function GET(): Promise<NextResponse> {
  try {
    const categories = await getRepository().listCategoryTree();
    return ok({ categories }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
