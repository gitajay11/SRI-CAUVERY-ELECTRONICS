import { NextResponse } from 'next/server';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { hashPassword, requireUser, verifyPassword } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validation';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { getRepository } from '@/services/repository';

/** POST /api/account/password — change the password, current one required. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'password'), LIMITS.login);
    const session = await requireUser();
    const body = changePasswordSchema.parse(await readJson(request));
    const repo = getRepository();

    const user = await repo.findUserById(session.id);
    if (!user) throw new AppError('Account not found.', 404, 'not_found');

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Your current password is not correct.', 401, 'invalid_password', {
        currentPassword: 'This does not match your current password.',
      });
    }

    await repo.updateUserPassword(user.id, await hashPassword(body.newPassword));
    return ok({ changed: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
