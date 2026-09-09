import 'server-only';
import { db } from '@tamizh/db';
import type { PrismaClient } from '@tamizh/db';
import type { ReviewStatus } from '@tamizh/db/enums';
import { notFound } from '@tamizh/core/api';
import { recordAudit } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Review moderation.
 *
 * A product's star rating is derived from its approved reviews only, and is
 * recalculated here whenever a review's status changes. Storing the average
 * on the product keeps catalogue listings fast; recomputing it in the same
 * transaction as the moderation keeps it honest.
 */

export interface ReviewFilters {
  q?: string;
  status?: ReviewStatus | 'ALL';
  rating?: number;
  page: number;
  pageSize: number;
}

export async function listReviews(filters: ReviewFilters) {
  const and: Record<string, unknown>[] = [];

  if (filters.status && filters.status !== 'ALL') and.push({ status: filters.status });
  if (filters.rating) and.push({ rating: filters.rating });
  if (filters.q) {
    and.push({
      OR: [
        { comment: { contains: filters.q, mode: 'insensitive' } },
        { title: { contains: filters.q, mode: 'insensitive' } },
        { product: { name: { contains: filters.q, mode: 'insensitive' } } },
        { user: { name: { contains: filters.q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = (and.length > 0 ? { AND: and } : {}) as never;

  const [total, rows, pending] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        reply: true,
        repliedAt: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
        user: { select: { id: true, name: true } },
        moderatedBy: { select: { name: true } },
      },
    }),
    db.review.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    total,
    pending,
    rows: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      comment: row.comment,
      status: row.status,
      reply: row.reply,
      repliedAt: row.repliedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      productId: row.product.id,
      productName: row.product.name,
      productImage: row.product.images[0]?.url ?? null,
      customerId: row.user.id,
      customerName: row.user.name,
      moderatedBy: row.moderatedBy?.name ?? null,
    })),
  };
}

/**
 * Recomputes a product's rating from its approved reviews.
 *
 * Runs inside the caller's transaction, so a product can never be left showing
 * an average that includes a review somebody just hid.
 */
async function recalculateRating(
  tx: Pick<PrismaClient, 'review' | 'product'>,
  productId: string,
) {
  const aggregate = await tx.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      ratingAvg: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      ratingCount: aggregate._count._all,
    },
  });
}

export async function moderateReview(
  actor: AdminIdentity,
  id: string,
  status: ReviewStatus,
) {
  const review = await db.review.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      rating: true,
      productId: true,
      product: { select: { name: true } },
    },
  });
  if (!review) throw notFound('Review not found.');

  await db.$transaction(async (tx) => {
    await tx.review.update({
      where: { id },
      data: { status, moderatedById: actor.id },
    });
    await recalculateRating(tx, review.productId);
    await recordAudit(
      actor,
      {
        action: 'review.moderated',
        entityType: 'Review',
        entityId: id,
        summary: `${review.rating}★ review of ${review.product.name}: ${review.status} → ${status}`,
        changes: { status: { from: review.status, to: status } },
      },
      tx,
    );
  });

  return { status };
}

/** Publishes a shop reply beneath a review. */
export async function replyToReview(actor: AdminIdentity, id: string, reply: string) {
  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, product: { select: { name: true } } },
  });
  if (!review) throw notFound('Review not found.');

  const trimmed = reply.trim();

  await db.$transaction(async (tx) => {
    await tx.review.update({
      where: { id },
      data: {
        reply: trimmed || null,
        repliedAt: trimmed ? new Date() : null,
        moderatedById: actor.id,
      },
    });
    await recordAudit(
      actor,
      {
        action: 'review.replied',
        entityType: 'Review',
        entityId: id,
        summary: trimmed
          ? `Replied to a review of ${review.product.name}`
          : `Removed the reply on a review of ${review.product.name}`,
      },
      tx,
    );
  });

  return { reply: trimmed || null };
}
