import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { removeProduct, updateProduct } from '@/services/products';
import { productInputSchema } from '@/lib/schemas';

/** PUT /api/admin/products/[id] — replace a product's details. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('products.update');
    const { id } = await params;
    const input = productInputSchema.parse(await readJson(request));

    // Changing a price is a separate, more sensitive permission.
    const existing = await import('@/services/products').then((module) =>
      module.getProduct(id),
    );
    const priceChanged =
      existing &&
      (existing.price !== input.price ||
        existing.mrp !== input.mrp ||
        existing.costPrice !== input.costPrice ||
        existing.taxBps !== input.taxBps);
    if (priceChanged) await requirePermission('products.price');

    await updateProduct(identity, id, input);
    return ok({ updated: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/products/[id] — archives when there is order history. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('products.delete');
    const { id } = await params;
    const result = await removeProduct(identity, id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
