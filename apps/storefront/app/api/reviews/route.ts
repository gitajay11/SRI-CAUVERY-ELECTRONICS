import { NextResponse } from 'next/server';
import { AppError, created, handleRouteError, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { requireUser } from '@/lib/auth';
import { reviewSchema } from '@/lib/validation';
import { getRepository } from '@/services/repository';

/**
 * POST /api/reviews — write or update a product review.
 *
 * Reviews are restricted to verified purchases. That is checked here rather
 * than only in the UI, so the rating on a product page reflects people who
 * actually bought it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'review'), LIMITS.review);
    const user = await requireUser();
    const body = reviewSchema.parse(await readJson(request));
    const repo = getRepository();

    const purchased = await repo.hasPurchased(user.id, body.productId);
    if (!purchased) {
      throw new AppError(
        'Only verified buyers can review this product.',
        403,
        'not_purchased',
      );
    }

    await repo.upsertReview(user.id, user.name, {
      productId: body.productId,
      rating: body.rating,
      title: body.title || undefined,
      comment: body.comment,
    });

    return created({ posted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
