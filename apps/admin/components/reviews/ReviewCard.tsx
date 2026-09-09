'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReviewStatus } from '@tamizh/db/enums';
import { formatDate } from '@tamizh/core/utils';
import type { TranslationKey } from '@/i18n';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Primitives';
import { Thumb } from '@/components/ui/Thumb';
import { FormError } from '@/components/ui/Field';
import { CheckIcon, EyeOffIcon, StarIcon } from '@/components/ui/Icons';

/**
 * One review, with the moderation controls beside it.
 *
 * Approving and hiding are one tap because they are the common case and both
 * are reversible. The reply box only opens when asked for — most reviews do
 * not need one, and an always-open textarea invites replies nobody meant to
 * write.
 */

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  productId: string;
  productName: string;
  productImage: string | null;
  customerId: string;
  customerName: string;
  moderatedBy: string | null;
}

const STATUS_LABELS: Record<ReviewStatus, TranslationKey> = {
  PENDING: 'reviews.status.PENDING',
  APPROVED: 'reviews.status.APPROVED',
  HIDDEN: 'reviews.status.HIDDEN',
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={star <= rating ? 'text-gold-500' : 'text-slate-200'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function ReviewCard({
  review,
  canModerate,
  canSeeCustomer,
}: {
  review: ReviewItem;
  canModerate: boolean;
  canSeeCustomer: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.reply ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: ReviewStatus) =>
    run(async () => {
      await api.patch(`/api/admin/reviews/${review.id}`, { status });
      toast(t('reviews.moderated'));
    });

  const saveReply = () =>
    run(async () => {
      await api.patch(`/api/admin/reviews/${review.id}`, { reply });
      toast(t('reviews.replied'));
      setReplying(false);
    });

  return (
    <article className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Thumb url={review.productImage} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars rating={review.rating} />
            <Link
              href={`/products/${review.productId}`}
              className="truncate text-sm font-medium text-slate-900 hover:underline"
            >
              {review.productName}
            </Link>
            <Badge
              tone={
                review.status === 'APPROVED'
                  ? 'positive'
                  : review.status === 'PENDING'
                    ? 'caution'
                    : 'neutral'
              }
            >
              {t(STATUS_LABELS[review.status])}
            </Badge>
          </div>

          {review.title ? (
            <p className="mt-1.5 text-sm font-semibold text-slate-900">{review.title}</p>
          ) : null}
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{review.comment}</p>

          <p className="mt-1.5 text-xs text-slate-400">
            {canSeeCustomer ? (
              <Link
                href={`/customers/${review.customerId}`}
                className="hover:text-brand-700 hover:underline"
              >
                {review.customerName}
              </Link>
            ) : (
              review.customerName
            )}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            {formatDate(review.createdAt)}
            {review.moderatedBy ? (
              <>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                {review.moderatedBy}
              </>
            ) : null}
          </p>

          {review.reply && !replying ? (
            <div className="mt-3 rounded-lg border-s-[3px] border-brand-300 bg-brand-50/60 px-3 py-2">
              <p className="text-xs font-semibold text-brand-700">{t('app.shopName')}</p>
              <p className="mt-0.5 text-sm text-slate-700">{review.reply}</p>
            </div>
          ) : null}

          {replying ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                aria-label={t('reviews.reply')}
                placeholder={t('reviews.replyPlaceholder')}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <div className="flex gap-2">
                <Button size="sm" loading={busy} onClick={() => void saveReply()}>
                  {t('common.save')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReply(review.reply ?? '');
                    setReplying(false);
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-2">
              <FormError>{error}</FormError>
            </div>
          ) : null}

          {canModerate ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.status !== 'APPROVED' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!online || busy}
                  onClick={() => void setStatus('APPROVED')}
                >
                  <CheckIcon className="text-[1.05em] text-positive-600" />
                  {t('reviews.approve')}
                </Button>
              ) : null}
              {review.status !== 'HIDDEN' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!online || busy}
                  onClick={() => void setStatus('HIDDEN')}
                >
                  <EyeOffIcon className="text-[1.05em]" />
                  {t('reviews.hide')}
                </Button>
              ) : null}
              {!replying ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!online}
                  onClick={() => setReplying(true)}
                >
                  {review.reply ? t('common.edit') : t('reviews.reply')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
