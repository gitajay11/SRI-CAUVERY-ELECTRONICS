import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Uniform JSON envelope for every route handler in both applications.
 *
 *   success → { data: … }
 *   failure → { error: { message, code?, fields? } }
 *
 * Errors are branded with globally registered symbols rather than relying on
 * `instanceof`. Next bundles server code into several module layers, so the
 * same file can be evaluated more than once in one process and two copies of a
 * class are not `instanceof`-compatible — without the brand, an error thrown
 * inside a service reaches the route handler unrecognised and is reported as a
 * 500. (That bug was real; this is the fix.)
 */

const APP_ERROR = Symbol.for('tamizh.AppError');
const AUTH_ERROR = Symbol.for('tamizh.AuthError');

export interface ApiErrorBody {
  error: { message: string; code?: string; fields?: Record<string, string> };
}

export class AppError extends Error {
  readonly [APP_ERROR] = true;

  constructor(
    message: string,
    readonly status = 400,
    readonly code?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 401 (not signed in) or 403 (signed in, not permitted). */
export class AuthError extends Error {
  readonly [AUTH_ERROR] = true;

  constructor(
    message: string,
    readonly status: 401 | 403,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && APP_ERROR in error;
}

export function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && AUTH_ERROR in error;
}

function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === 'ZodError' &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(message, 404, 'not_found');
}

export function forbidden(message = 'You do not have permission to do that.'): AuthError {
  return new AuthError(message, 403, 'forbidden');
}

export function unauthorized(message = 'Sign in to continue.'): AuthError {
  return new AuthError(message, 401, 'unauthorized');
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function fail(
  message: string,
  status = 400,
  extra?: { code?: string; fields?: Record<string, string> },
): NextResponse {
  return NextResponse.json<ApiErrorBody>({ error: { message, ...extra } }, { status });
}

/** Flattens a ZodError into `{ field: message }` for form rendering. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

/**
 * Converts anything thrown inside a route handler into a JSON response.
 * Unexpected errors are logged server-side and reported generically, so stack
 * traces and driver messages never reach the browser.
 */
export function handleRouteError(error: unknown): NextResponse {
  if (isZodError(error)) {
    return fail('Please correct the highlighted fields.', 422, {
      code: 'validation_error',
      fields: fieldErrors(error),
    });
  }
  if (isAuthError(error)) {
    return fail(error.message, error.status, {
      code: error.code ?? (error.status === 401 ? 'unauthorized' : 'forbidden'),
    });
  }
  if (isAppError(error)) {
    return fail(error.message, error.status, { code: error.code, fields: error.fields });
  }

  console.error('[api] unhandled error', error);
  return fail(
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong on our side. Please try again.'
      : `Unhandled server error: ${error instanceof Error ? error.message : String(error)}`,
    500,
    { code: 'internal_error' },
  );
}

/** Parses a JSON body, returning a friendly error instead of throwing. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('The request body was not valid JSON.', 400, 'bad_json');
  }
}
