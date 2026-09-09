import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { addToCartSchema, updateCartItemSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';
import { getCartView, resolveOrCreateCartOwner } from '@/services/cart';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * POST /api/cart/items — add a product to the cart.
 *
 * The body carries a product id and a quantity, never a price: the amount
 * payable is always derived from the catalogue on the server.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = addToCartSchema.parse(await readJson(request));
    const owner = await resolveOrCreateCartOwner();

    await getRepository().addToCart(
      owner,
      body.productId,
      body.variantId ?? null,
      body.quantity,
    );

    return ok(await getCartView(), noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/cart/items — change a line quantity; zero removes the line. */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body = updateCartItemSchema.parse(await readJson(request));
    const owner = await resolveOrCreateCartOwner();

    await getRepository().setCartItemQuantity(owner, body.itemId, body.quantity);

    return ok(await getCartView(), noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/cart/items — empty the cart. */
export async function DELETE(): Promise<NextResponse> {
  try {
    const owner = await resolveOrCreateCartOwner();
    await getRepository().clearCart(owner);
    return ok(await getCartView(), noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
