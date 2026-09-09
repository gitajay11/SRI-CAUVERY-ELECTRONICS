import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';

/** GET /api/orders — the signed-in shopper's order history. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const orders = await getRepository().listOrdersForUser(user.id);
    return ok({ orders }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
