import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { removeBanner, saveBanner } from '@/services/settings';
import { bannerInputSchema } from '@/lib/schemas';

/** PUT /api/admin/banners/[id] — change homepage content. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('content.manage');
    const { id } = await params;
    const input = bannerInputSchema.parse(await readJson(request));
    await saveBanner(identity, id, input);
    return ok({ updated: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/banners/[id] — remove homepage content. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('content.manage');
    const { id } = await params;
    return ok(await removeBanner(identity, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
