import { NextResponse } from 'next/server';
import { z } from 'zod';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { addOrderNote } from '@/services/orders';

const schema = z.object({
  body: z.string().trim().min(2, 'Write a short note').max(1000),
});

/** POST /api/admin/orders/[orderNumber]/notes — staff-only note. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('orders.note');
    const { orderNumber } = await params;
    const input = schema.parse(await readJson(request));

    const note = await addOrderNote(identity, orderNumber, input.body);
    return created({ id: note.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
