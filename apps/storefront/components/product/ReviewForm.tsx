'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField, FormError } from '@/components/ui/Field';
import { StarIcon } from '@/components/ui/Icons';

/**
 * Review form.
 *
 * Only shown to signed-in shoppers who have actually bought the product — the
 * server enforces the same rule, so reviews stay trustworthy rather than
 * becoming a spam surface.
 */
export function ReviewForm({
  productId,
  canReview,
  isSignedIn,
}: {
  productId: string;
  canReview: boolean;
  isSignedIn: boolean;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!isSignedIn) {
    return (
      <p className="rounded-card border border-ink-200 bg-surface p-4 text-sm text-ink-600">
        <Link href="/signin" className="font-semibold text-brand-700 hover:underline">
          {t('product.reviewSignIn')}
        </Link>
      </p>
    );
  }

  if (!canReview) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});

    if (rating === 0) {
      setError(t('product.rating') + ': ' + t('error.required'));
      return;
    }

    setBusy(true);
    try {
      await api.post('/api/reviews', { productId, rating, title, comment });
      toast(t('product.reviewSubmitted'));
      setRating(0);
      setTitle('');
      setComment('');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError(t('error.body'));
      }
    } finally {
      setBusy(false);
    }
  };

  const shown = hovered || rating;

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-card border border-ink-100 bg-surface p-4 sm:p-5"
    >
      <h3 className="text-base font-bold text-ink-900">{t('product.writeReview')}</h3>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-700">
          {t('product.rating')}
          <span className="ml-0.5 text-danger-500">*</span>
        </legend>
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHovered(value)}
              aria-label={t('product.ratingOf', { rating: value })}
              aria-pressed={rating === value}
              className={cn(
                'grid size-10 place-items-center rounded-lg text-2xl transition-colors',
                value <= shown ? 'text-gold-500' : 'text-ink-300 hover:text-gold-300',
              )}
            >
              <StarIcon filled={value <= shown} />
            </button>
          ))}
        </div>
      </fieldset>

      <TextField
        label={t('contact.subject')}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        optionalLabel={t('common.optional')}
        maxLength={120}
        error={fields.title}
      />

      <TextAreaField
        label={t('contact.message')}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        required
        minLength={10}
        maxLength={2000}
        error={fields.comment}
      />

      {error ? <FormError>{error}</FormError> : null}

      <Button type="submit" loading={busy}>
        {t('product.writeReview')}
      </Button>
    </form>
  );
}
