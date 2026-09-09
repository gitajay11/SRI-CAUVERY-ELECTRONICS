import { NextResponse } from 'next/server';
import { db } from '@tamizh/db';
import { handleRouteError, ok } from '@tamizh/core/api';
import { requireAdmin } from '@/lib/session';
import { recordAudit } from '@/lib/audit';

/**
 * DELETE /api/admin/account/sessions — sign out everywhere else.
 *
 * Only ever touches the caller's own sessions, and never the one making the
 * request: signing yourself out of the page you are using is not what anyone
 * means by this.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();

    const result = await db.adminSession.updateMany({
      where: {
        userId: identity.id,
        revokedAt: null,
        NOT: { id: identity.sessionId },
      },
      data: { revokedAt: new Date(), revokedReason: 'signed out elsewhere' },
    });

    await recordAudit(identity, {
      action: 'auth.signed_out',
      entityType: 'AdminUser',
      entityId: identity.id,
      summary: `Ended ${result.count} other session(s)`,
    });

    return ok({ ended: result.count });
  } catch (error) {
    return handleRouteError(error);
  }
}
