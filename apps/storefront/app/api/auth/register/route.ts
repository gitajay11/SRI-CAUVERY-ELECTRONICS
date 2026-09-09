import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson, AppError } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { registerSchema } from '@/lib/validation';
import {
  createSessionToken,
  hashPassword,
  peekAnonymousId,
  setSessionCookie,
} from '@/lib/auth';
import { getRepository } from '@/services/repository';

/**
 * POST /api/auth/register — create a customer account and sign in.
 *
 * A guest cart, if there is one, is folded into the new account so nothing a
 * shopper collected before registering is lost.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'register'), LIMITS.register);
    const body = registerSchema.parse(await readJson(request));
    const repo = getRepository();

    const existing = await repo.findUserByEmail(body.email);
    if (existing) {
      throw new AppError(
        'An account already exists with this email address.',
        409,
        'email_taken',
        { email: 'This email is already registered. Try signing in instead.' },
      );
    }

    const user = await repo.createUser({
      email: body.email,
      name: body.name,
      phone: body.phone ?? null,
      passwordHash: await hashPassword(body.password),
    });

    const anonymousId = await peekAnonymousId();
    if (anonymousId) await repo.mergeCarts(anonymousId, user.id);

    await setSessionCookie(createSessionToken(user));

    return created({
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
