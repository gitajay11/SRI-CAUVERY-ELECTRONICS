import { NextResponse } from 'next/server';
import { z } from 'zod';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { rupeesSchema } from '@tamizh/core/validation';
import { requirePermission } from '@/lib/session';
import { requestRefund } from '@/services/money';

const schema = z.object({
  orderId: z.string().min(1).max(64),
  returnRequestId: z.string().max(64).nullish(),
  /** Typed in rupees; the schema converts to paise. */
  amount: rupeesSchema,
  reason: z.string().trim().min(3, 'Say what the refund is for').max(300),
});

/**
 * POST /api/admin/refunds — raise a refund for approval.
 *
 * Raising is not approving: the amount is only checked against what is
 * actually refundable, and it still needs `refunds.approve` to go anywhere.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('refunds.view');
    const input = schema.parse(await readJson(request));
    const refund = await requestRefund(identity, input);
    return created({ id: refund.id, amount: refund.amount });
  } catch (error) {
    return handleRouteError(error);
  }
}
