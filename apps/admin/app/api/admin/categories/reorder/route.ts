import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { reorderCategories } from '@/services/categories';

const schema = z.object({
  order: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        sortOrder: z.coerce.number().int().min(0).max(9999),
      }),
    )
    .min(1)
    .max(200),
});

/** POST /api/admin/categories/reorder — apply a new display order. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('categories.manage');
    const { order } = schema.parse(await readJson(request));
    const result = await reorderCategories(identity, order);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
