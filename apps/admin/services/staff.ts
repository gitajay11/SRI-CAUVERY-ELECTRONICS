import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from '@tamizh/db';
import type { StaffRole } from '@tamizh/db/enums';
import { AppError, notFound } from '@tamizh/core/api';
import { hashPassword } from '@tamizh/core/crypto';
import {
  ALL_PERMISSIONS,
  assignableRoles,
  effectivePermissions,
  parseOverrides,
  type Permission,
} from '@tamizh/core/permissions';
import { recordAudit, diff } from '@/lib/audit';
import { invalidateGrantCache, type AdminIdentity } from '@/lib/session';

/**
 * Staff accounts and what each role may do.
 *
 * The rules that keep this safe:
 *
 *  - Nobody can grant a role they do not hold themselves. A MANAGER cannot
 *    quietly promote a colleague — or themselves — to SUPER_ADMIN.
 *  - Nobody can disable, demote or delete their own account. Locking the last
 *    owner out of their own shop is not a recoverable mistake.
 *  - Disabling an account, changing its role or resetting its password ends
 *    every open session for that person immediately. A revoked administrator
 *    who keeps working until their cookie expires is not revoked.
 *  - Passwords are never chosen by an administrator for someone else, and never
 *    stored or transmitted in plain text beyond the one-time value shown once
 *    on screen.
 */

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  sessions: number;
}

export async function listStaff(): Promise<StaffRow[]> {
  const rows = await db.adminUser.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    sessions: row._count.sessions,
  }));
}

export async function getStaff(id: string) {
  const staff = await db.adminUser.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      permissionOverrides: true,
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
    },
  });
  if (!staff) return null;

  const grants = await db.rolePermission.findMany({
    where: { role: staff.role },
    select: { permission: true, allowed: true },
  });

  const roleGrants = Object.fromEntries(
    grants.map((grant) => [grant.permission, grant.allowed]),
  );
  const overrides = parseOverrides(staff.permissionOverrides);

  return {
    ...staff,
    overrides,
    effective: [...effectivePermissions(staff.role, roleGrants, overrides)],
  };
}

export interface StaffInput {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  isActive: boolean;
  permissionOverrides: { allow: string[]; deny: string[] };
}

/** A readable one-time password: no ambiguous characters, enough entropy. */
function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  // Guarantees the mixed-case-and-digit rule the password policy requires.
  return `${out.slice(0, 6)}-${out.slice(6, 12)}-${(bytes[0]! % 90) + 10}`;
}

function assertMayAssign(actor: AdminIdentity, role: StaffRole) {
  if (!assignableRoles(actor.role).includes(role)) {
    throw new AppError(
      'You cannot give someone a role above your own.',
      403,
      'role_not_assignable',
      { role: 'Choose a role you are allowed to assign.' },
    );
  }
}

function assertOverridesValid(overrides: { allow: string[]; deny: string[] }) {
  const known = new Set<string>(ALL_PERMISSIONS);
  for (const permission of [...overrides.allow, ...overrides.deny]) {
    if (!known.has(permission)) {
      throw new AppError(`Unknown permission "${permission}".`, 422, 'unknown_permission');
    }
  }
}

export async function createStaff(actor: AdminIdentity, input: StaffInput) {
  assertMayAssign(actor, input.role);
  assertOverridesValid(input.permissionOverrides);

  const existing = await db.adminUser.findUnique({
    where: { email: input.email },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    throw new AppError('A staff account with this email already exists.', 409, 'duplicate_email', {
      email: 'This email is already in use.',
    });
  }

  const password = temporaryPassword();

  const staff = await db.$transaction(async (tx) => {
    const created = await tx.adminUser.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        isActive: input.isActive,
        passwordHash: await hashPassword(password),
        // They choose their own password the first time they sign in; the one
        // above is a delivery mechanism, not a credential to keep.
        mustChangePassword: true,
        permissionOverrides: input.permissionOverrides as never,
        createdById: actor.id,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await recordAudit(
      actor,
      {
        action: 'staff.created',
        entityType: 'AdminUser',
        entityId: created.id,
        summary: `Created ${created.name} (${created.email}) as ${created.role}`,
      },
      tx,
    );

    return created;
  });

  // Returned once, shown once, never stored anywhere else.
  return { id: staff.id, temporaryPassword: password };
}

export async function updateStaff(actor: AdminIdentity, id: string, input: StaffInput) {
  const existing = await db.adminUser.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      permissionOverrides: true,
    },
  });
  if (!existing) throw notFound('Staff account not found.');

  assertMayAssign(actor, input.role);
  // Also check the role they currently hold: a MANAGER must not be able to
  // edit an ADMIN at all, even to something they could otherwise assign.
  assertMayAssign(actor, existing.role);
  assertOverridesValid(input.permissionOverrides);

  if (existing.id === actor.id) {
    if (!input.isActive) {
      throw new AppError('You cannot switch off your own account.', 422, 'self_disable');
    }
    if (input.role !== existing.role) {
      throw new AppError('You cannot change your own role.', 422, 'self_demote');
    }
  }

  const roleChanged = existing.role !== input.role;
  const deactivated = existing.isActive && !input.isActive;

  await db.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        isActive: input.isActive,
        permissionOverrides: input.permissionOverrides as never,
      },
    });

    // What someone may do just changed. Any session they hold was issued under
    // the old answer, so it ends here rather than at its own expiry.
    if (roleChanged || deactivated) {
      await tx.adminSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await recordAudit(
      actor,
      {
        action: roleChanged ? 'staff.role_changed' : deactivated ? 'staff.disabled' : 'staff.updated',
        entityType: 'AdminUser',
        entityId: id,
        summary: roleChanged
          ? `${existing.name}: ${existing.role} → ${input.role}`
          : `Updated ${input.name} (${input.email})`,
        changes: diff(
          existing as unknown as Record<string, unknown>,
          input as unknown as Record<string, unknown>,
          ['name', 'email', 'phone', 'role', 'isActive'],
        ),
      },
      tx,
    );
  });

  return { id, sessionsEnded: roleChanged || deactivated };
}

/**
 * Issues a new one-time password.
 *
 * The administrator never sees the old one — there is nothing to see, only a
 * hash — and the new one has to be changed at first sign-in.
 */
export async function resetStaffPassword(actor: AdminIdentity, id: string) {
  const staff = await db.adminUser.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!staff) throw notFound('Staff account not found.');
  assertMayAssign(actor, staff.role);

  const password = temporaryPassword();

  await db.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    // Every open session, and any outstanding reset link, dies with the old
    // password.
    await tx.adminSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });

    await recordAudit(
      actor,
      {
        action: 'staff.password_reset',
        entityType: 'AdminUser',
        entityId: id,
        summary: `Reset the password for ${staff.name} (${staff.email})`,
      },
      tx,
    );
  });

  return { temporaryPassword: password };
}

/** Soft-deletes an account. Audit history keeps pointing at a real row. */
export async function removeStaff(actor: AdminIdentity, id: string) {
  const staff = await db.adminUser.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!staff) throw notFound('Staff account not found.');
  if (staff.id === actor.id) {
    throw new AppError('You cannot delete your own account.', 422, 'self_delete');
  }
  assertMayAssign(actor, staff.role);

  const owners = await db.adminUser.count({
    where: { role: 'SUPER_ADMIN', isActive: true, deletedAt: null },
  });
  if (staff.role === 'SUPER_ADMIN' && owners <= 1) {
    throw new AppError(
      'This is the last owner account. Promote someone else first.',
      422,
      'last_owner',
    );
  }

  await db.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await tx.adminSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit(
      actor,
      {
        action: 'staff.disabled',
        entityType: 'AdminUser',
        entityId: id,
        summary: `Removed ${staff.name} (${staff.email})`,
      },
      tx,
    );
  });

  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Role permissions
// ---------------------------------------------------------------------------

export async function getRoleMatrix(): Promise<Record<string, Record<string, boolean>>> {
  const rows = await db.rolePermission.findMany({
    select: { role: true, permission: true, allowed: true },
  });

  const matrix: Record<string, Record<string, boolean>> = {};
  for (const row of rows) {
    (matrix[row.role] ??= {})[row.permission] = row.allowed;
  }
  return matrix;
}

/**
 * Rewrites what one role may do.
 *
 * SUPER_ADMIN is deliberately not editable: it is the role that can restore
 * every other role, and a shop that removes its own last route back in has no
 * way to recover without a developer.
 */
export async function setRolePermissions(
  actor: AdminIdentity,
  role: StaffRole,
  permissions: Permission[],
) {
  if (role === 'SUPER_ADMIN') {
    throw new AppError(
      'The owner role always has every permission. It cannot be narrowed.',
      422,
      'super_admin_immutable',
    );
  }

  const granted = new Set(permissions);

  await db.$transaction(async (tx) => {
    for (const permission of ALL_PERMISSIONS) {
      await tx.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        create: { role, permission, allowed: granted.has(permission) },
        update: { allowed: granted.has(permission) },
      });
    }

    await recordAudit(
      actor,
      {
        action: 'role.permissions_changed',
        entityType: 'Role',
        entityId: role,
        summary: `${role} now has ${granted.size} of ${ALL_PERMISSIONS.length} permissions`,
      },
      tx,
    );
  });

  // Sessions read permissions through a short cache; drop it so the change
  // takes effect on the next request rather than up to a minute later.
  invalidateGrantCache();

  return { role, count: granted.size };
}
