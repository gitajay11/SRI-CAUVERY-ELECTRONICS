import 'server-only';
import { db } from '@tamizh/db';
import { notFound } from '@tamizh/core/api';
import { recordAudit } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Customers.
 *
 * What is deliberately absent matters as much as what is here: no password
 * hash, no session data, and no way for staff to sign in as a customer. Staff
 * see what they need to serve someone on the phone — what they ordered, where
 * it went, what they spent — and nothing more.
 *
 * Blocking is reversible and never deletes an account: past orders have to
 * keep resolving to a real customer.
 */

export interface CustomerFilters {
  q?: string;
  status?: 'all' | 'active' | 'blocked';
  sort?: 'recent' | 'spend' | 'orders';
  page: number;
  pageSize: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  blocked: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  joinedAt: string;
}

export async function listCustomers(filters: CustomerFilters): Promise<{
  rows: CustomerRow[];
  total: number;
}> {
  const and: Record<string, unknown>[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        { phone: { contains: filters.q } },
      ],
    });
  }
  if (filters.status === 'blocked') and.push({ blockedAt: { not: null } });
  if (filters.status === 'active') and.push({ blockedAt: null });

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        blockedAt: true,
        createdAt: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: { total: true, placedAt: true },
        },
      },
    }),
  ]);

  const mapped = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    blocked: row.blockedAt !== null,
    orderCount: row.orders.length,
    totalSpent: row.orders.reduce((sum, order) => sum + order.total, 0),
    lastOrderAt:
      row.orders.length > 0
        ? row.orders
            .map((order) => order.placedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]!
            .toISOString()
        : null,
    joinedAt: row.createdAt.toISOString(),
  }));

  // Lifetime value and order count are derived, so they are ordered here
  // rather than in SQL. The page size keeps that honest.
  if (filters.sort === 'spend') mapped.sort((a, b) => b.totalSpent - a.totalSpent);
  if (filters.sort === 'orders') mapped.sort((a, b) => b.orderCount - a.orderCount);

  return { total, rows: mapped };
}

export async function getCustomer(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      blockedAt: true,
      createdAt: true,
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          label: true,
          fullName: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
          isDefault: true,
        },
      },
      orders: {
        orderBy: { placedAt: 'desc' },
        take: 25,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          placedAt: true,
          items: { select: { quantity: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          createdAt: true,
          product: { select: { id: true, name: true } },
        },
      },
      wishlist: {
        select: { _count: { select: { items: true } } },
      },
    },
  });
  if (!user) return null;

  const paidOrders = user.orders.filter((order) => order.status !== 'CANCELLED');
  const lifetimeValue = paidOrders.reduce((sum, order) => sum + order.total, 0);

  return {
    ...user,
    blocked: user.blockedAt !== null,
    stats: {
      orderCount: paidOrders.length,
      lifetimeValue,
      averageOrder: paidOrders.length > 0 ? Math.round(lifetimeValue / paidOrders.length) : 0,
      wishlistCount: user.wishlist?._count.items ?? 0,
    },
  };
}

/**
 * Blocks or unblocks a customer.
 *
 * Blocking sets `blockedAt` and clears `isActive`. The storefront refuses a
 * sign-in for either, and re-reads the account at checkout so an already-open
 * session cannot keep ordering. Nothing is deleted, and the reason goes into
 * the audit log rather than onto the customer record.
 */
export async function setCustomerBlocked(
  actor: AdminIdentity,
  id: string,
  blocked: boolean,
  reason?: string,
) {
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, blockedAt: true },
  });
  if (!user) throw notFound('Customer not found.');

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        blockedAt: blocked ? new Date() : null,
        isActive: !blocked,
      },
    });

    if (blocked) {
      // Drop their carts too. The storefront session cookie is signed rather
      // than stored, so it stays valid until it expires; checkout re-reads the
      // account, which is where blocking actually bites.
      await tx.cart.deleteMany({ where: { userId: id } });
    }

    await recordAudit(
      actor,
      {
        action: blocked ? 'customer.blocked' : 'customer.unblocked',
        entityType: 'User',
        entityId: id,
        summary: `${blocked ? 'Blocked' : 'Unblocked'} ${user.name}${
          reason ? ` — ${reason}` : ''
        }`,
      },
      tx,
    );
  });

  return { blocked };
}
