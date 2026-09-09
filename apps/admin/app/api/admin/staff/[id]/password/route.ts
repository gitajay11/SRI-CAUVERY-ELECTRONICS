import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { resetStaffPassword } from '@/services/staff';

/**
 * POST /api/admin/staff/[id]/password — issue a new one-time password.
 *
 * Ends every session that account holds. The response carries the new password
 * once; it is never retrievable afterwards.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('staff.manage');
    const { id } = await params;
    return ok(await resetStaffPassword(identity, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
