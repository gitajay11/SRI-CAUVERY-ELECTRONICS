import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { db } from '@tamizh/db';
import type { StaffRole } from '@tamizh/db/enums';
import { createToken, hashToken, signValue, unsign } from '@tamizh/core/crypto';
import {
  effectivePermissions,
  hasPermission,
  parseOverrides,
  type Permission,
} from '@tamizh/core/permissions';
import { AuthError, forbidden, unauthorized } from '@tamizh/core/api';
import { adminAuthSecret, isProduction, SESSION_HOURS, SESSION_IDLE_HOURS } from './env';

/**
 * Admin sessions.
 *
 * Unlike the storefront's stateless cookie, an admin session is a row in the
 * database. That is the whole point: when someone leaves, or a laptop is lost,
 * access has to end at once rather than whenever a signed cookie expires.
 *
 * The cookie carries a random token; only its SHA-256 is stored, so a database
 * leak does not hand over live sessions. The cookie value is additionally
 * signed, which lets an obviously forged token be rejected without a query.
 */

export const ADMIN_SESSION_COOKIE = 'te_admin_session';

const cookieOptions = {
  httpOnly: true,
  /**
   * Lax, not Strict.
   *
   * Strict withholds the cookie on *every* cross-site request including a
   * plain top-level navigation, so arriving from a bookmark, an email or a
   * link in a chat presented no session at all — the panel then redirected to
   * "your session has expired" while the session was in fact alive and
   * untouched on the server.
   *
   * The security intent is preserved. Lax still withholds the cookie from
   * cross-site POST, PATCH and DELETE, which is where CSRF actually lives, and
   * every one of this app's 34 mutating routes is one of those verbs — no GET
   * handler writes to the database. What Lax now allows is a cross-site GET
   * navigation, which only renders a page.
   */
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
} as const;

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: StaffRole;
  mustChangePassword: boolean;
  permissions: Set<Permission>;
  sessionId: string;
}

async function clientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  return {
    ip: forwarded?.split(',')[0]?.trim() ?? store.get('x-real-ip') ?? null,
    userAgent: store.get('user-agent')?.slice(0, 300) ?? null,
  };
}

/**
 * Creates a session row and returns the raw cookie value.
 * The caller writes the cookie; sign-in also records the login on the user.
 */
export async function createSession(userId: string): Promise<string> {
  const token = createToken(32);
  const { ip, userAgent } = await clientMeta();

  const session = await db.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_HOURS * 3_600_000),
    },
    select: { id: true },
  });

  await db.adminUser.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  void session;
  return signValue(token, adminAuthSecret());
}

export async function setSessionCookie(signedToken: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, signedToken, {
    ...cookieOptions,
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}

/** Ends the current session server-side, so the token is dead immediately. */
export async function revokeCurrentSession(reason = 'signed out'): Promise<void> {
  const store = await cookies();
  const signed = store.get(ADMIN_SESSION_COOKIE)?.value;
  const token = signed ? unsign(signed, adminAuthSecret()) : null;
  if (token) {
    await db.adminSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
  await clearSessionCookie();
}

/** Ends every session for a user — used when disabling or demoting an account. */
export async function revokeAllSessions(userId: string, reason: string): Promise<void> {
  await db.adminSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

/**
 * The signed-in staff member, or null.
 *
 * Everything is re-read from the database on each request: the account may
 * have been disabled, demoted, or had its permissions changed since sign-in,
 * and none of that should wait for a cookie to expire.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const store = await cookies();
  const signed = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!signed) return null;
  return resolveIdentity(signed);
}

/**
 * Resolves a session cookie to an identity, memoised **per request**.
 *
 * `cache()` from React is what makes that per-request rather than per-process:
 * one render can ask half a dozen guards who is signed in without six queries,
 * and the next request still re-reads the database. A module-level cache here
 * would keep a revoked session alive until the process restarted, which is the
 * opposite of what revocation means.
 */
const resolveIdentity = cache(async (signed: string): Promise<AdminIdentity | null> => {
  const token = unsign(signed, adminAuthSecret());
  if (!token) return null;

  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          deletedAt: true,
          mustChangePassword: true,
          permissionOverrides: true,
        },
      },
    },
  });

  const now = Date.now();
  const invalid =
    !session ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() < now ||
    now - session.lastSeenAt.getTime() > SESSION_IDLE_HOURS * 3_600_000 ||
    !session.user.isActive ||
    session.user.deletedAt !== null;

  if (invalid) return null;

  // Touch at most once a minute; a write on every request would be wasteful.
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await db.adminSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  const grants = await roleGrants(session.user.role);
  const overrides = parseOverrides(session.user.permissionOverrides);

  const identity: AdminIdentity = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
    permissions: effectivePermissions(session.user.role, grants, overrides),
    sessionId: session.id,
  };

  return identity;
});

/**
 * Database permission grants for a role.
 *
 * Cached for a minute: this is read on virtually every request, and a change
 * taking up to sixty seconds to propagate is an acceptable trade for not
 * querying the table on every page render.
 */
const grantCache = new Map<string, { at: number; grants: Record<string, boolean> }>();
const GRANT_TTL_MS = 60_000;

export async function roleGrants(role: StaffRole): Promise<Record<string, boolean>> {
  const cached = grantCache.get(role);
  if (cached && Date.now() - cached.at < GRANT_TTL_MS) return cached.grants;

  const rows = await db.rolePermission.findMany({
    where: { role },
    select: { permission: true, allowed: true },
  });
  const grants = Object.fromEntries(rows.map((row) => [row.permission, row.allowed]));
  grantCache.set(role, { at: Date.now(), grants });
  return grants;
}

/** Call after editing RolePermission so the change is visible immediately. */
export function invalidateGrantCache(role?: StaffRole): void {
  if (role) grantCache.delete(role);
  else grantCache.clear();
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) throw unauthorized();
  return identity;
}

/**
 * The guard every privileged API route calls.
 *
 * Server-side and non-negotiable: the UI hiding a button is a convenience, not
 * a control.
 */
export async function requirePermission(
  permission: Permission,
): Promise<AdminIdentity> {
  const identity = await requireAdmin();
  if (!identity.permissions.has(permission)) {
    throw forbidden(`You do not have permission to ${permission.replace('.', ' ')}.`);
  }
  return identity;
}

/** Any one of several permissions is enough. */
export async function requireAnyPermission(
  ...permissions: Permission[]
): Promise<AdminIdentity> {
  const identity = await requireAdmin();
  if (!permissions.some((permission) => identity.permissions.has(permission))) {
    throw forbidden();
  }
  return identity;
}

export function can(identity: AdminIdentity, permission: Permission): boolean {
  return identity.permissions.has(permission);
}

export { AuthError, hasPermission };
export type { Permission };
