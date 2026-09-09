import 'server-only';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import type { SessionUser } from '@tamizh/core/types';
import { authSecret, isProduction } from './env';

/**
 * Authentication.
 *
 * Sessions are stateless, signed cookies (HMAC-SHA256 over a compact JSON
 * payload). Passwords are hashed with scrypt from Node's crypto module, so the
 * app carries no auth dependency at all. Two cookies are used:
 *
 *   te_session   httpOnly  — the signed session, never readable by scripts
 *   te_anon      httpOnly  — guest cart identifier, created lazily
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'te_session';
export const ANON_COOKIE = 'te_anon';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SCRYPT_KEYLEN = 64;

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

/** Returns `scrypt$<saltHex>$<hashHex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Constant-time password check. Never throws on malformed stored hashes. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = await scryptAsync(password, salt, expected.length);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

interface SessionPayload {
  /** User id. */
  sub: string;
  email: string;
  name: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

function sign(value: string): string {
  return createHmac('sha256', authSecret()).update(value).digest('base64url');
}

export function createSessionToken(user: {
  id: string;
  email: string;
  name: string;
}): string {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verifies signature and expiry. Returns null for anything suspicious. */
export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as SessionPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers (server components, route handlers and server actions)
// ---------------------------------------------------------------------------

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
} as const;

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...baseCookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...baseCookieOptions, maxAge: 0 });
}

/**
 * The signed-in user, taken straight from the cookie.
 *
 * The payload is trusted for identity display and authorisation because it is
 * HMAC-signed; anything that mutates data still re-reads the user row so a
 * deactivated or demoted account cannot keep acting on an old cookie.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const payload = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    phone: null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('Sign in to continue.', 401);
  return user;
}

/**
 * Stable identifier for a guest's cart. Created on first use and kept in an
 * httpOnly cookie so it cannot be read or spoofed by page scripts.
 */
export async function getOrCreateAnonymousId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;

  const id = randomBytes(16).toString('hex');
  store.set(ANON_COOKIE, id, {
    ...baseCookieOptions,
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return id;
}

/** Reads the guest id without creating one — used on read-only paths. */
export async function peekAnonymousId(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  return existing && /^[a-f0-9]{32}$/.test(existing) ? existing : null;
}

/**
 * Branded with a global symbol for the same reason as AppError: Next may
 * evaluate this module once per server bundle layer, so `instanceof` is not
 * reliable across a service/route-handler boundary.
 */
const AUTH_ERROR = Symbol.for('tamizh.AuthError');

export class AuthError extends Error {
  readonly [AUTH_ERROR] = true;

  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && AUTH_ERROR in error;
}
