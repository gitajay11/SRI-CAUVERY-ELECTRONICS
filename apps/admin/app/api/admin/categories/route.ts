import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { createCategory } from '@/services/categories';
import { categoryInputSchema } from '@/lib/schemas';

/** POST /api/admin/categories — create a category. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('categories.manage');
    const input = categoryInputSchema.parse(await readJson(request));
    const category = await createCategory(identity, input);
    return created({ id: category.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
