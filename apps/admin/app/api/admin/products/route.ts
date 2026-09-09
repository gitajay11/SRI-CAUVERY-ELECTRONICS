import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { createProduct } from '@/services/products';
import { productInputSchema } from '@/lib/schemas';

/** POST /api/admin/products — create a product. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('products.create');
    const input = productInputSchema.parse(await readJson(request));
    const product = await createProduct(identity, input);
    return created({ id: product.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
