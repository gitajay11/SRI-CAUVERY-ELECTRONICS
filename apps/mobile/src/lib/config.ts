import Constants from 'expo-constants';

/**
 * Where the storefront API lives.
 *
 * A build for testers or the stores must name it in EXPO_PUBLIC_API_URL. In
 * development it can be left out: the phone already reaches the computer
 * running `expo start` (that is how it loaded this bundle), so the storefront
 * dev server on that same computer is assumed.
 */
function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && devHost) {
    const port = process.env.EXPO_PUBLIC_DEV_API_PORT?.trim() || '3000';
    return `http://${devHost}:${port}`;
  }

  throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to apps/mobile/.env before building.');
}

export const API_URL = resolveApiUrl();

/** Product images and other storefront files are served as site paths. */
export function assetUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
