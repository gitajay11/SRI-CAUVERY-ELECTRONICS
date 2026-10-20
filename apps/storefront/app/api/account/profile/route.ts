import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { issueSession, requireUser } from '@/lib/auth';
import { profileSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';

/**
 * PATCH /api/account/profile — update name and phone.
 *
 * The session carries the display name, so it is reissued here; without that
 * the header would keep showing the old name until the next sign-in. The
 * mobile app gets the new token in the body and should keep it.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await requireUser();
    const body = profileSchema.parse(await readJson(request));

    const user = await getRepository().updateUserProfile(session.id, {
      name: body.name,
      phone: body.phone || null,
    });

    const reissued = await issueSession(user);

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      ...reissued,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
