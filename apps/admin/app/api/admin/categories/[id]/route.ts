import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { removeCategory, setCategoryActive, updateCategory } from '@/services/categories';
import { categoryInputSchema } from '@/lib/schemas';

/** PUT /api/admin/categories/[id] — replace a category's details. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('categories.manage');
    const { id } = await params;
    const input = categoryInputSchema.parse(await readJson(request));
    await updateCategory(identity, id, input);
    return ok({ updated: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/admin/categories/[id] — show or hide it on the shop. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('categories.manage');
    const { id } = await params;
    const { isActive } = z
      .object({ isActive: z.boolean() })
      .parse(await readJson(request));
    const result = await setCategoryActive(identity, id, isActive);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/categories/[id] — refused while anything depends on it. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('categories.manage');
    const { id } = await params;
    const result = await removeCategory(identity, id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
