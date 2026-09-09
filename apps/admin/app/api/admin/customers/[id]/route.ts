import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { setCustomerBlocked } from '@/services/customers';

const schema = z.object({
  blocked: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

/** PATCH /api/admin/customers/[id] — block or unblock a customer. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('customers.manage');
    const { id } = await params;
    const { blocked, reason } = schema.parse(await readJson(request));
    const result = await setCustomerBlocked(identity, id, blocked, reason);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
