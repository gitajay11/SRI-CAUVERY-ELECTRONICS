import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { decideCancellation } from '@/services/cancellations';

const schema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(500).optional(),
});

/**
 * PATCH /api/admin/cancellations/[requestNumber] — approve or reject.
 *
 * Guarded by the permission to cancel orders, because approving is exactly
 * that. The service refuses a request that has already been decided.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestNumber: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('orders.cancel');
    const { requestNumber } = await params;
    const decision = schema.parse(await readJson(request));
    const result = await decideCancellation(identity, decodeURIComponent(requestNumber), decision);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
