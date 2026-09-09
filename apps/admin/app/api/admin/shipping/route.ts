import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { saveShippingZone } from '@/services/settings';
import { shippingZoneSchema } from '@/lib/schemas';

/** POST /api/admin/shipping — add a delivery zone. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('shipping.manage');
    const input = shippingZoneSchema.parse(await readJson(request));
    const zone = await saveShippingZone(identity, null, input);
    return created({ id: zone.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
