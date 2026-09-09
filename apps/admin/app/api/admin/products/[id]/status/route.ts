import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { setProductStatus } from '@/services/products';

const schema = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']) });

/** PATCH /api/admin/products/[id]/status — publish or unpublish. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('products.publish');
    const { id } = await params;
    const { status } = schema.parse(await readJson(request));
    await setProductStatus(identity, id, status);
    return ok({ status });
  } catch (error) {
    return handleRouteError(error);
  }
}
