import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { cuidSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };
const toggleSchema = z.object({ productId: cuidSchema });

/** GET /api/wishlist — the signed-in shopper's saved products. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const products = await getRepository().listWishlist(user.id);
    return ok({ products }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/wishlist — toggle a product.
 *
 * A wishlist belongs to an account, so guests get a 401 and the UI prompts
 * them to sign in rather than silently dropping the tap.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = toggleSchema.parse(await readJson(request));
    const result = await getRepository().toggleWishlist(user.id, body.productId);
    return ok(result, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
