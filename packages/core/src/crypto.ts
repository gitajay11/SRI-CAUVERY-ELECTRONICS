import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Framework-free authentication primitives, shared by both applications.
 *
 * Everything here uses Node's own crypto — the project carries no auth
 * dependency. Cookie handling and session storage differ between the two apps
 * and live in each app's own `lib/session.ts`.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

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

/**
 * Constant-time password check. Never throws, whatever is stored — a malformed
 * hash simply fails to verify.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
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

/**
 * A dummy hash to verify against when no account matches, so that sign-in
 * takes the same time whether or not the email exists.
 */
export const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

// ---------------------------------------------------------------------------
// Opaque tokens (admin sessions, password resets)
// ---------------------------------------------------------------------------

/** A high-entropy, URL-safe token. The raw value is shown to the client once. */
export function createToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * What gets stored for a token.
 *
 * Session and reset tokens are stored hashed, so a database leak does not hand
 * over live sessions. SHA-256 is right here (unlike for passwords): the input
 * already has full entropy, so there is nothing to brute-force.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// ---------------------------------------------------------------------------
// Signed values (stateless cookies, CSRF tokens)
// ---------------------------------------------------------------------------

export function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

/** Verifies `value.signature`, returning the value or null. */
export function unsign(signed: string, secret: string): string | null {
  const dot = signed.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = signed.slice(0, dot);
  const signature = signed.slice(dot + 1);
  return tokensMatch(signature, sign(value, secret)) ? value : null;
}

export function signValue(value: string, secret: string): string {
  return `${value}.${sign(value, secret)}`;
}
