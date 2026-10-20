import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requireUser } from '@/lib/auth';
import { registerPushToken, removePushToken } from '@/services/push-tokens';

const tokenSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'Not an Expo push token');

const registerSchema = z.object({
  token: tokenSchema,
  platform: z.enum(['ios', 'android']),
  locale: z.enum(['en', 'ta']).default('en'),
});

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * POST /api/account/push-token — this phone wants order updates for the
 * signed-in account. Called by the mobile app after the shopper allows
 * notifications, and again when the token or the language changes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = registerSchema.parse(await readJson(request));
    await registerPushToken({ userId: user.id, ...body });
    return ok({ registered: true }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/account/push-token — this phone is signing out; stop sending to it. */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { token } = z.object({ token: tokenSchema }).parse(await readJson(request));
    await removePushToken(user.id, token);
    return ok({ removed: true }, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
