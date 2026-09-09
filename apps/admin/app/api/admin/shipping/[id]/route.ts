import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { removeShippingZone, saveShippingZone } from '@/services/settings';
import { shippingZoneSchema } from '@/lib/schemas';

/** PUT /api/admin/shipping/[id] — change a delivery zone. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('shipping.manage');
    const { id } = await params;
    const input = shippingZoneSchema.parse(await readJson(request));
    await saveShippingZone(identity, id, input);
    return ok({ updated: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/shipping/[id] — remove a delivery zone. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('shipping.manage');
    const { id } = await params;
    return ok(await removeShippingZone(identity, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
