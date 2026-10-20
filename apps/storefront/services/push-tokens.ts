import 'server-only';
import { getPrisma } from '@tamizh/db';

/**
 * The mobile app's push tokens: which phones belong to which account.
 *
 * A token is a phone, not a person, so registering one that another account
 * held moves it to the account signed in now — whoever is holding the phone
 * is who should hear about their orders.
 */

export async function registerPushToken(input: {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  locale: 'en' | 'ta';
}): Promise<void> {
  await getPrisma().customerPushToken.upsert({
    where: { token: input.token },
    create: input,
    update: { userId: input.userId, platform: input.platform, locale: input.locale },
  });
}

/** Signing out on a phone stops its notifications for that account. */
export async function removePushToken(userId: string, token: string): Promise<void> {
  await getPrisma().customerPushToken.deleteMany({ where: { token, userId } });
}
