import 'server-only';
import { headers } from 'next/headers';
import { db, type PrismaClient } from '@tamizh/db';
import type { AdminIdentity } from './session';

/**
 * Audit logging.
 *
 * Every privileged mutation records who did what, to which record, and what
 * changed. Two rules make the log trustworthy:
 *
 *  1. It is written inside the same transaction as the change, so the log can
 *     never disagree with the data. Pass the transaction client as `tx`.
 *  2. `actorEmail` is denormalised, so the entry still says who acted even if
 *     the staff account is later removed.
 *
 * It is append-only. Nothing in the application updates or deletes a row.
 */

export type AuditAction =
  | 'auth.signed_in'
  | 'auth.signed_out'
  | 'auth.failed_sign_in'
  | 'auth.password_changed'
  | 'auth.password_reset'
  | 'product.created'
  | 'product.updated'
  | 'product.price_changed'
  | 'product.published'
  | 'product.unpublished'
  | 'product.archived'
  | 'product.deleted'
  | 'product.duplicated'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'category.reordered'
  | 'inventory.adjusted'
  | 'order.status_changed'
  | 'order.cancelled'
  | 'order.note_added'
  | 'payment.status_changed'
  | 'refund.requested'
  | 'refund.approved'
  | 'refund.rejected'
  | 'refund.completed'
  | 'return.approved'
  | 'return.rejected'
  | 'return.received'
  | 'return.closed'
  | 'coupon.created'
  | 'coupon.updated'
  | 'coupon.deleted'
  | 'review.moderated'
  | 'review.replied'
  | 'customer.blocked'
  | 'customer.unblocked'
  | 'staff.created'
  | 'staff.updated'
  | 'staff.disabled'
  | 'staff.role_changed'
  | 'staff.password_reset'
  | 'role.permissions_changed'
  | 'settings.updated'
  | 'shipping.updated'
  | 'content.updated'
  | 'media.uploaded'
  | 'report.exported';

/**
 * Just the slice of the client this module needs.
 *
 * Derived from PrismaClient so the create call stays fully type-checked, and
 * narrow enough that a transaction client satisfies it too — which is how an
 * audit entry commits or rolls back with the change it describes.
 */
type AuditClient = Pick<PrismaClient, 'auditLog'>;

export interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  /** Only what changed, as `{ field: { from, to } }`. */
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/**
 * Diffs two records, keeping only the fields that actually differ.
 *
 * Keeps the log readable — an audit entry that repeats every column is one
 * nobody reads.
 */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  fields: (keyof T)[],
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    if (!(field in after)) continue;
    const from = before[field];
    const to = after[field];
    // Dates and arrays need value comparison, not identity.
    const same =
      from instanceof Date && to instanceof Date
        ? from.getTime() === to.getTime()
        : Array.isArray(from) || Array.isArray(to)
          ? JSON.stringify(from) === JSON.stringify(to)
          : from === to;
    if (!same) changes[String(field)] = { from, to };
  }
  return changes;
}

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const store = await headers();
    const forwarded = store.get('x-forwarded-for');
    return {
      ip: forwarded?.split(',')[0]?.trim() ?? store.get('x-real-ip') ?? null,
      userAgent: store.get('user-agent')?.slice(0, 300) ?? null,
    };
  } catch {
    // Outside a request (a script, a background job) there are no headers.
    return { ip: null, userAgent: null };
  }
}

/**
 * Writes an audit entry.
 *
 * @param client Pass the transaction client when the change is transactional,
 *               so the entry commits or rolls back with it.
 */
export async function recordAudit(
  actor: Pick<AdminIdentity, 'id' | 'email'> | null,
  input: AuditInput,
  client: AuditClient = db,
): Promise<void> {
  const { ip, userAgent } = await requestMeta();
  await client.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      // Prisma types Json columns as its own InputJsonValue union, which a
      // plain Record does not structurally satisfy; the shape is correct.
      changes: (input.changes ?? {}) as never,
      ip,
      userAgent,
    },
  });
}

/**
 * Records a failed sign-in.
 *
 * Deliberately separate: there is no actor to attribute it to, and it must
 * never throw — a logging failure should not turn a wrong password into a 500.
 */
export async function recordFailedSignIn(email: string): Promise<void> {
  try {
    const { ip, userAgent } = await requestMeta();
    await db.auditLog.create({
      data: {
        actorEmail: email.slice(0, 200),
        action: 'auth.failed_sign_in',
        entityType: 'AdminUser',
        summary: `Failed sign-in attempt for ${email}`,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[audit] could not record failed sign-in', error);
  }
}
