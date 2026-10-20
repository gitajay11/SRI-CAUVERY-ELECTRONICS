import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type * as NotificationsModule from 'expo-notifications';
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
 * Remote push needs a development or store build with an EAS project id.
 * Everywhere else — Expo Go (no remote push on Android since SDK 53, and no
 * project id to ask for a token with), simulators, builds before `eas init` —
 * this does nothing, and does not even load expo-notifications, whose import
 * alone prints Expo Go warnings.
 */

type Notifications = typeof NotificationsModule;

const TOKEN_KEY = 'push.token';

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Whether this build can receive remote notifications at all. */
export function pushSupported(): boolean {
  return Device.isDevice && !isRunningInExpoGo() && Boolean(projectId());
}

let loaded: Promise<Notifications> | null = null;

/**
 * expo-notifications, loaded on first use and set up once: notifications
 * show while the app is open too (the shopper wants to know the parcel
 * moved), and Android gets the "Order updates" channel the admin sends to.
 */
export function loadNotifications(): Promise<Notifications> | null {
  if (!pushSupported()) return null;
  loaded ??= import('expo-notifications').then(async (Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
      });
    }
    return Notifications;
  });
  return loaded;
}

export async function permissionGranted(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  return (await Notifications.getPermissionsAsync()).status === 'granted';
}

/**
 * Registers this phone for the signed-in account. With `ask`, shows the
 * system prompt if the shopper has not answered it yet; without, registers
 * only if permission was already given (used at sign-in and app start).
 * Resolves to whether the phone is now registered.
 */
export async function registerForOrderUpdates(locale: Locale, ask: boolean): Promise<boolean> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return false;

    let granted = (await Notifications.getPermissionsAsync()).status === 'granted';
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
    if (__DEV__) console.log(`[notifications] registered ${token}`);
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
