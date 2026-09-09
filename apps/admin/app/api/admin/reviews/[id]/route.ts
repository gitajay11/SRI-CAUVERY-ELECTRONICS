import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { requirePermission } from '@/lib/session';
import { moderateReview, replyToReview } from '@/services/reviews';

const schema = z.union([
  z.object({ status: z.enum(['PENDING', 'APPROVED', 'HIDDEN']) }),
  z.object({ reply: z.string().trim().max(1000) }),
]);

/**
 * PATCH /api/admin/reviews/[id] — moderate a review, or reply to it.
 *
 * Both are the same permission: a shop reply is published under the shop's
 * name on the storefront, so it is moderation, not commentary.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requirePermission('reviews.moderate');
    const { id } = await params;
    const body = schema.parse(await readJson(request));

    if ('status' in body) {
      return ok(await moderateReview(identity, id, body.status));
    }
    return ok(await replyToReview(identity, id, body.reply));
  } catch (error) {
    return handleRouteError(error);
  }
}
