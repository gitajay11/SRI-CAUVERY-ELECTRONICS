import { NextResponse } from 'next/server';
import { handleRouteError, ok } from '@tamizh/core/api';
import { getAdminIdentity, revokeCurrentSession } from '@/lib/session';
import { recordAudit } from '@/lib/audit';

/** POST /api/admin/auth/logout — revokes the session server-side. */
export async function POST(): Promise<NextResponse> {
  try {
    const identity = await getAdminIdentity();
    if (identity) {
      await recordAudit(identity, {
        action: 'auth.signed_out',
        entityType: 'AdminUser',
        entityId: identity.id,
        summary: `${identity.name} signed out`,
      });
    }
    await revokeCurrentSession();
    return ok({ signedOut: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
