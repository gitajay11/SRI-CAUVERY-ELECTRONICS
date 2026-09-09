import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { progressReturn } from '@/services/money';

const schema = z.object({
  status: z.enum([
    'APPROVED',
    'REJECTED',
    'PICKUP_SCHEDULED',
    'RECEIVED',
    'REFUND_PENDING',
    'REFUNDED',
    'CLOSED',
  ]),
  note: z.string().trim().max(500).optional(),
  pickupAt: z.string().max(40).optional(),
  outcomes: z
    .array(
      z.object({
        returnItemId: z.string().min(1).max(64),
        outcome: z.enum(['RESTOCK', 'DAMAGED']),
      }),
    )
    .max(50)
    .optional(),
});

/** PATCH /api/admin/returns/[returnNumber] — move a return along. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ returnNumber: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('returns.manage');
    const { returnNumber } = await params;
    const decision = schema.parse(await readJson(request));
    const result = await progressReturn(identity, returnNumber, decision);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
