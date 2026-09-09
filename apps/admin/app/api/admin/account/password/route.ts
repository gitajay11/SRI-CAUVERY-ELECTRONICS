import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@tamizh/db';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { hashPassword, verifyPassword } from '@tamizh/core/crypto';
import { staffPasswordSchema } from '@tamizh/core/validation';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { requireAdmin } from '@/lib/session';
import { recordAudit } from '@/lib/audit';

/**
 * POST /api/admin/account/password — change your own password.
 *
 * Requires the current password even though the session is already trusted: a
 * borrowed unlocked laptop should not be enough to lock the owner out of their
 * own shop.
 *
 * Every *other* session that account holds is ended. The one making the change
 * survives, so nobody is signed out of the page they are standing on.
 */

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: staffPasswordSchema,
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireAdmin();
    consume(clientKey(request, `password:${identity.id}`), LIMITS.passwordReset);

    const body = schema.parse(await readJson(request));

    const account = await db.adminUser.findUnique({
      where: { id: identity.id },
      select: { passwordHash: true },
    });
    if (!account) throw new AppError('Account not found.', 404, 'not_found');

    const valid = await verifyPassword(body.currentPassword, account.passwordHash);
    if (!valid) {
      await recordAudit(identity, {
        action: 'auth.failed_sign_in',
        entityType: 'AdminUser',
        entityId: identity.id,
        summary: 'Wrong current password given when changing password',
      });
      throw new AppError('That is not your current password.', 422, 'wrong_password', {
        currentPassword: 'Incorrect password.',
      });
    }

    if (body.currentPassword === body.newPassword) {
      throw new AppError('Choose a password you have not used here before.', 422, 'same_password', {
        newPassword: 'Must be different from your current password.',
      });
    }

    const passwordHash = await hashPassword(body.newPassword);

    await db.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id: identity.id },
        data: { passwordHash, mustChangePassword: false },
      });

      // Other devices are signed out; a password change is often a response to
      // suspecting one of them is no longer in the right hands.
      await tx.adminSession.updateMany({
        where: { userId: identity.id, revokedAt: null, NOT: { id: identity.sessionId } },
        data: { revokedAt: new Date(), revokedReason: 'password changed' },
      });

      await tx.passwordResetToken.deleteMany({ where: { userId: identity.id } });

      await recordAudit(
        identity,
        {
          action: 'auth.password_changed',
          entityType: 'AdminUser',
          entityId: identity.id,
          summary: 'Changed their own password',
        },
        tx,
      );
    });

    return ok({ changed: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
