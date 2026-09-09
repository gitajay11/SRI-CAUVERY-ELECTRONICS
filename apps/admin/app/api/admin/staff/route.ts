import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { createStaff } from '@/services/staff';
import { staffInputSchema } from '@/lib/schemas';

/**
 * POST /api/admin/staff — add a member of staff.
 *
 * Responds with a one-time password. It is shown once and never stored in
 * readable form; the account must change it at first sign-in.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requirePermission('staff.manage');
    const input = staffInputSchema.parse(await readJson(request));
    const result = await createStaff(identity, input);
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
