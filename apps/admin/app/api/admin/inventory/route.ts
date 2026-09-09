import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { adjustStock } from '@/services/inventory';

const schema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullish(),
  mode: z.enum(['delta', 'set']),
  value: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  reason: z.enum([
    'PURCHASE',
    'MANUAL_ADJUSTMENT',
    'CUSTOMER_RETURN',
    'DAMAGED',
    'LOST',
    'STOCK_TAKE',
  ]),
  note: z.string().trim().max(300).optional(),
});

/**
 * POST /api/admin/inventory — adjust stock.
 *
 * The reason is required by the schema, not optional with a default: a stock
 * movement without a reason is exactly what makes a ledger useless later.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('inventory.adjust');
    const input = schema.parse(await readJson(request));
    const result = await adjustStock(identity, input);
    return ok({ before: result.before, after: result.after });
  } catch (error) {
    return handleRouteError(error);
  }
}
