import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { handleRouteError, ok } from '@tamizh/core/api';
import { getRepository } from '@/services/repository';

/**
 * GET /api/auth/me — the signed-in user, re-read from the database.
 *
 * The cookie alone is enough for display, but this endpoint re-reads the row
 * so a deactivated or renamed account is reflected immediately.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSessionUser();
    if (!session) return ok({ user: null });

    const user = await getRepository().findUserById(session.id);
    if (!user || !user.isActive) return ok({ user: null });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
