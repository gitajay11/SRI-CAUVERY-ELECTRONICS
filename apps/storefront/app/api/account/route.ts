import { NextResponse } from 'next/server';
import { AppError, handleRouteError, ok, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { clearSessionCookie, requireUser, verifyPassword } from '@/lib/auth';
import { deleteAccountSchema } from '@/lib/validation';
import { setCouponCookie } from '@/services/cart';
import { forgetCatalog, getRepository } from '@/services/repository';

/**
 * DELETE /api/account — delete the signed-in shopper's account.
 *
 * The password is asked for again, so a phone left unlocked or a stolen
 * session cannot erase an account on its own. Addresses, carts, the wishlist
 * and reviews go with it; past orders stay with the shop, detached from the
 * account, because the shop must keep its sales records. Refused while an
 * order, return or cancellation is still in progress.
 *
 * Sessions are stateless, so a token issued before the deletion still verifies
 * until it expires — but it names an account that no longer exists, so it reads
 * back nothing and checkout refuses it. The browser's cookie is cleared here;
 * the mobile app discards its token.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'delete-account'), LIMITS.login);
    const session = await requireUser();
    const body = deleteAccountSchema.parse(await readJson(request));
    const repo = getRepository();

    const user = await repo.findUserById(session.id);
    if (!user) throw new AppError('Account not found.', 404, 'not_found');

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError('That password is not correct.', 401, 'invalid_password', {
        password: 'This does not match your password.',
      });
    }

    const { reviewedProductIds } = await repo.deleteUser(user.id);
    if (reviewedProductIds.length > 0) forgetCatalog();

    await clearSessionCookie();
    await setCouponCookie(null);
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
