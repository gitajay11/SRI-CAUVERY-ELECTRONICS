import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import type { Locale } from '@tamizh/core/types';
import { api } from './api';

/**
 * Order updates on the phone.
 *
 * The app asks for permission at a moment that explains itself — right after
 * an order is placed — and registers this phone's Expo push token with the
 * account. The admin panel sends through Expo when staff move the order.
 *
 * Where remote push cannot work it quietly does nothing: on a simulator, in
 * Expo Go on Android (Expo removed remote push there in SDK 53), and in any
 * build without an EAS project id. A development or store build has all three.
 */

const TOKEN_KEY = 'push.token';

// Shown while the app is open too: the shopper wants to know the parcel moved.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Whether this build can receive remote notifications at all. */
export function pushSupported(): boolean {
  if (!Device.isDevice) return false;
  if (Platform.OS === 'android' && isRunningInExpoGo()) return false;
  return Boolean(projectId());
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // The admin panel sends to this channel ("channelId: 'orders'").
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
  });
}

export async function permissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Registers this phone for the signed-in account. With `ask`, shows the
 * system prompt if the shopper has not answered it yet; without, registers
 * only if permission was already given (used at sign-in and app start).
 * Resolves to whether the phone is now registered.
 */
export async function registerForOrderUpdates(locale: Locale, ask: boolean): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    await ensureChannel();
    let granted = await permissionGranted();
    if (!granted && ask) {
      granted = (await Notifications.requestPermissionsAsync()).status === 'granted';
    }
    if (!granted) return false;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await api.post('/api/account/push-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      locale,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[notifications] could not register', error);
    return false;
  }
}

/** Before signing out: this phone stops hearing about that account's orders. */
export async function unregisterOrderUpdates(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await api.delete('/api/account/push-token', { token });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Offline: the server prunes the token later, when Expo reports it gone
    // or the next account registers this phone.
  }
}
