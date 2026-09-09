import { NextResponse } from 'next/server';
import { db } from '@tamizh/db';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '@tamizh/core/crypto';
import { emailSchema } from '@tamizh/core/validation';
import { z } from 'zod';
import { createSession, setSessionCookie } from '@/lib/session';
import { recordAudit, recordFailedSignIn } from '@/lib/audit';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

/**
 * POST /api/admin/auth/login
 *
 * The response is identical for "no such account", "wrong password" and
 * "disabled account", and a dummy hash is verified when no account matches so
 * the timing does not differ either. An attacker learns nothing about which
 * staff emails exist.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'admin-login'), LIMITS.adminLogin);
    const body = loginSchema.parse(await readJson(request));

    const user = await db.adminUser.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        deletedAt: true,
        mustChangePassword: true,
      },
    });

    const valid = await verifyPassword(
      body.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !valid || !user.isActive || user.deletedAt) {
      await recordFailedSignIn(body.email);
      throw new AppError(
        'That email and password combination did not match.',
        401,
        'invalid_credentials',
      );
    }

    const signedToken = await createSession(user.id);
    await setSessionCookie(signedToken);

    await recordAudit(
      { id: user.id, email: user.email },
      {
        action: 'auth.signed_in',
        entityType: 'AdminUser',
        entityId: user.id,
        summary: `${user.name} signed in`,
      },
    );

    return ok({
      user: { id: user.id, name: user.name, email: user.email },
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
