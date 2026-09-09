import { NextResponse } from 'next/server';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { loginSchema } from '@/lib/validation';
import {
  createSessionToken,
  peekAnonymousId,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';
import { getRepository } from '@/services/repository';

/**
 * POST /api/auth/login
 *
 * The response is deliberately identical for "no such user" and "wrong
 * password" so the endpoint cannot be used to enumerate registered emails,
 * and a dummy hash comparison runs for unknown accounts to keep the timing
 * roughly constant.
 */
const DUMMY_HASH =
  'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'login'), LIMITS.login);
    const body = loginSchema.parse(await readJson(request));
    const repo = getRepository();

    const user = await repo.findUserByEmail(body.email);
    const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid || !user.isActive) {
      throw new AppError(
        'That email and password combination did not match.',
        401,
        'invalid_credentials',
      );
    }

    const anonymousId = await peekAnonymousId();
    if (anonymousId) await repo.mergeCarts(anonymousId, user.id);

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
