import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { removeStaff, updateStaff } from '@/services/staff';
import { staffInputSchema } from '@/lib/schemas';

/** PUT /api/admin/staff/[id] — change a staff account. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('staff.manage');
    const { id } = await params;
    const input = staffInputSchema.parse(await readJson(request));
    return ok(await updateStaff(identity, id, input));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/admin/staff/[id] — remove a staff account. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('staff.manage');
    const { id } = await params;
    return ok(await removeStaff(identity, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
