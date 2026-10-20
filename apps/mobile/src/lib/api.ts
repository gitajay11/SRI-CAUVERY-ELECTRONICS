import { API_URL } from './config';
import { session } from './session';

/**
 * The storefront API, as the app calls it.
 *
 * Same envelope as the website's client (`{ data }` or `{ error }`), with the
 * headers that stand in for its cookies: the bearer token once signed in, the
 * guest cart id before, and the applied coupon. `X-Auth-Transport: bearer` on
 * every call means a sign-in hands its token back in the body instead of
 * setting a cookie — React Native's fetch keeps a cookie jar of its own, and
 * the app must never come to depend on it.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const OFFLINE_MESSAGE = 'You appear to be offline. Please check your connection and try again.';
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  json?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, signal } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Auth-Transport': 'bearer',
    'X-Coupon-Code': session.coupon ?? '',
  };
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  else headers['X-Guest-Id'] = await session.guestId();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      credentials: 'omit',
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(OFFLINE_MESSAGE, 0, 'network_error');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw new ApiError(GENERIC_MESSAGE, response.status);
  }

  if (!response.ok) {
    const body = payload as {
      error?: { message?: string; code?: string; fields?: Record<string, string> };
    } | null;
    throw new ApiError(
      body?.error?.message ?? GENERIC_MESSAGE,
      response.status,
      body?.error?.code,
      body?.error?.fields,
    );
  }

  return (payload as { data: T }).data;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'POST', json }),
  patch: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'PATCH', json }),
  delete: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'DELETE', json }),
};
