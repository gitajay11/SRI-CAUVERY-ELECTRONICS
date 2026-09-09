/**
 * Fetch wrapper for the admin browser code.
 *
 * Every API route answers with `{ data }` or `{ error: { message, fields } }`,
 * so client components handle both shapes in one place.
 *
 * Two rules matter more here than on the storefront:
 *
 *  - A request is refused outright when the browser is offline, rather than
 *    being attempted and failing ambiguously. An admin must never be left
 *    unsure whether a refund or a stock change went through.
 *  - A 401 means the session ended (revoked, expired, idle). The caller is
 *    told through `code`, so the UI can send the person back to sign in
 *    instead of showing a confusing error.
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

export const OFFLINE_MESSAGE =
  'You are offline. Nothing has been saved — reconnect and try again.';

export async function apiRequest<T>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(OFFLINE_MESSAGE, 0, 'offline');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0, 'network_error');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError('Something went wrong. Please try again.', response.status);
    }
  }

  if (!response.ok) {
    const body = payload as { error?: { message?: string; code?: string; fields?: Record<string, string> } };
    throw new ApiError(
      body?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      body?.error?.code,
      body?.error?.fields,
    );
  }

  return (payload as { data: T }).data;
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  post: <T>(url: string, json?: unknown) => apiRequest<T>(url, { method: 'POST', json }),
  patch: <T>(url: string, json?: unknown) => apiRequest<T>(url, { method: 'PATCH', json }),
  put: <T>(url: string, json?: unknown) => apiRequest<T>(url, { method: 'PUT', json }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
};
