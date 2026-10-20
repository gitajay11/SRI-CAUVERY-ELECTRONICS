import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * What the app keeps between launches to stand in for the website's cookies.
 *
 *   token     the signed session, sent as `Authorization: Bearer`
 *   guestId   the guest cart's id, sent as `X-Guest-Id` until sign-in
 *   coupon    the applied coupon code, sent as `X-Coupon-Code`
 *
 * All three live in the device keychain / keystore. They are read once at
 * start-up into memory, so building a request never waits on storage.
 */

const KEYS = {
  token: 'session.token',
  guestId: 'session.guestId',
  coupon: 'session.coupon',
} as const;

interface SessionState {
  token: string | null;
  guestId: string | null;
  coupon: string | null;
}

const state: SessionState = { token: null, guestId: null, coupon: null };
let loaded: Promise<void> | null = null;

/** Reads the stored values once; every later call returns the same promise. */
export function loadSession(): Promise<void> {
  loaded ??= (async () => {
    const [token, guestId, coupon] = await Promise.all([
      SecureStore.getItemAsync(KEYS.token),
      SecureStore.getItemAsync(KEYS.guestId),
      SecureStore.getItemAsync(KEYS.coupon),
    ]);
    state.token = token;
    state.guestId = guestId;
    state.coupon = coupon;
  })();
  return loaded;
}

async function write(key: keyof SessionState, value: string | null): Promise<void> {
  state[key] = value;
  if (value === null) await SecureStore.deleteItemAsync(KEYS[key]);
  else await SecureStore.setItemAsync(KEYS[key], value);
}

export const session = {
  get token(): string | null {
    return state.token;
  },
  get coupon(): string | null {
    return state.coupon;
  },

  setToken: (token: string | null) => write('token', token),
  setCoupon: (code: string | null) => write('coupon', code),

  /**
   * The guest cart id, made on first use: 16 random bytes as hex, the form
   * the server accepts. It outlives sign-in and sign-out on purpose — the
   * server folds the guest cart into the account when the shopper signs in.
   */
  async guestId(): Promise<string> {
    if (state.guestId) return state.guestId;
    const bytes = await Crypto.getRandomBytesAsync(16);
    const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    await write('guestId', id);
    return id;
  },
};
