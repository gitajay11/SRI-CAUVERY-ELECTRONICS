import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { saveBanner } from '@/services/settings';
import { bannerInputSchema } from '@/lib/schemas';

/** POST /api/admin/banners — add homepage content. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('content.manage');
    const input = bannerInputSchema.parse(await readJson(request));
    const banner = await saveBanner(identity, null, input);
    return created({ id: banner.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
