import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { updateOrderStatus } from '@/services/orders';

const schema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY_TO_SHIP',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURNED',
    'REFUNDED',
  ]),
  trackingNumber: z.string().trim().max(80).optional(),
  courier: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
  cancelReason: z.string().trim().max(300).optional(),
});

/**
 * PATCH /api/admin/orders/[orderNumber]
 *
 * Transitions, stock returns and the audit entry all happen inside one
 * transaction in the service. This handler's job is authorisation and shape.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('orders.update_status');
    const { orderNumber } = await params;
    const body = schema.parse(await readJson(request));

    const order = await updateOrderStatus(identity, orderNumber, body);
    return ok({ status: order.status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
