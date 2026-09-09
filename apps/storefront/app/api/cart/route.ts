import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { getCartView } from '@/services/cart';

/**
 * GET /api/cart — the shopper's cart, fully priced by the server.
 *
 * Never cached: prices, stock and totals must reflect this moment, and the
 * contents are personal.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cart = await getCartView();
    return ok(cart, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
