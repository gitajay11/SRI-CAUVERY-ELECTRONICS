import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { decideRefund } from '@/services/money';

const schema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED']),
  note: z.string().trim().max(500).optional(),
  method: z.string().trim().max(60).optional(),
  reference: z.string().trim().max(120).optional(),
});

/** PATCH /api/admin/refunds/[id] — approve, reject or settle a refund. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('refunds.approve');
    const { id } = await params;
    const decision = schema.parse(await readJson(request));
    const result = await decideRefund(identity, id, decision);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
