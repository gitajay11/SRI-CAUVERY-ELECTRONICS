import { NextResponse } from 'next/server';
import { created, handleRouteError } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { duplicateProduct } from '@/services/products';

/** POST /api/admin/products/[id]/duplicate — copy as a draft. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('products.create');
    const { id } = await params;
    const copy = await duplicateProduct(identity, id);
    return created({ id: copy.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
