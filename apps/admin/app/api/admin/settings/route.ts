import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { updateSettings } from '@/services/settings';
import { settingsInputSchema } from '@/lib/schemas';

/** PUT /api/admin/settings — change how the shop behaves. */
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('settings.manage');
    const input = settingsInputSchema.parse(await readJson(request));
    const result = await updateSettings(identity, input);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
