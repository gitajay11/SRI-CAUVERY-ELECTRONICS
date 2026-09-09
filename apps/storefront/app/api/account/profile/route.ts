import { NextResponse } from 'next/server';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { createSessionToken, requireUser, setSessionCookie } from '@/lib/auth';
import { profileSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';

/**
 * PATCH /api/account/profile — update name and phone.
 *
 * The session cookie carries the display name, so it is reissued here; without
 * that the header would keep showing the old name until the next sign-in.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await requireUser();
    const body = profileSchema.parse(await readJson(request));

    const user = await getRepository().updateUserProfile(session.id, {
      name: body.name,
      phone: body.phone || null,
    });

    await setSessionCookie(createSessionToken(user));

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
