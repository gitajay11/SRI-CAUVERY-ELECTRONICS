'use client';

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import type { CartItemView, OrderView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { lineKey, type OrderReview, type SeenLine } from '@/lib/order-review';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useModalDialog } from '@/hooks/useModalDialog';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Primitives';
import { AlertIcon, CloseIcon, MapPinIcon, TruckIcon } from '@/components/ui/Icons';

/** The checkout details as the review and the order endpoints take them. */
export type CheckoutRequest = Record<string, unknown> & { paymentMethod: 'COD' };

type Failure = { message: string; retry: 'confirm' | 'review' };

/**
 * The order review: a bottom sheet on a phone, a centred modal from tablet
 * width up.
 *
 * Nothing is placed until "Confirm order". What it shows is fetched fresh
 * from the server each time it opens — the cart as it is now, today's
 * prices, the totals, the delivery window — and any line that changed since
 * the shopper last saw it is flagged, with confirming held back until they
 * accept the update.
 *
 * Confirming carries an idempotency key, made once per opening and reused
 * for every retry of it, so a lost response or a second tap can never place
 * a second order. It also carries the reviewed order's fingerprint, so the
 * server refuses if what it would place is no longer what was shown.
 */
export function OrderReviewSheet({
  request,
  closing = false,
  cartItems,
  returnFocusRef,
  onClose,
  onEditAddress,
  onEditCart,
  onInvalidDetails,
  onPlaced,
}: {
  request: CheckoutRequest;
  /** True while it animates out; it is already closed for focus and input. */
  closing?: boolean;
  /** The cart as the checkout page showed it: the first baseline. */
  cartItems: CartItemView[];
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onEditAddress: () => void;
  onEditCart: () => void;
  /** The details themselves are wrong; the form is where to fix them. */
  onInvalidDetails: (message: string, fields: Record<string, string>) => void;
  onPlaced: (order: OrderView) => void;
}) {
  const { t, pick, locale } = useLocale();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Mounted afresh for every opening, so all of this starts clean each time.
  const [review, setReview] = useState<OrderReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  // What the shopper has seen: the cart page's lines at first, then each
  // review they accepted. Changes are always measured against this.
  const seenRef = useRef<SeenLine[]>(
    cartItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  );
  // One key per opening, reused by every retry of this confirm.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  // Names and pictures of lines the shopper saw, for flagging ones that went.
  const [seenDetails] = useState(() => new Map(cartItems.map((item) => [lineKey(item), item])));
  const inFlight = useRef(false);

  const requestClose = useModalDialog({
    open: !closing,
    onClose,
    panelRef,
    returnFocusRef,
    canClose: !confirming,
  });

  /** Fetches the review. Sets state only once the answer is in. */
  const fetchReview = useCallback(async () => {
    try {
      const next = await api.post<OrderReview>('/api/checkout/review', {
        ...request,
        seen: seenRef.current,
      });
      setReview(next);
      setAccepted(!next.changed);
      setLoadFailure(null);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422 && caught.fields) {
        requestClose(true);
        onInvalidDetails(caught.message, caught.fields);
        return;
      }
      setReview(null);
      setLoadFailure(
        caught instanceof ApiError && caught.status !== 0 && caught.status < 500
          ? caught.message
          : t('review.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [request, onInvalidDetails, t, requestClose]);

  /** Fetches it again, showing the skeleton or spinner meanwhile. */
  const loadReview = useCallback(async () => {
    setLoading(true);
    setLoadFailure(null);
    setFailure(null);
    await fetchReview();
  }, [fetchReview]);

  // On opening. The request and the cart are fixed while the sheet is up.
  useEffect(() => {
    void fetchReview();
  }, [fetchReview]);

  const acceptUpdates = () => {
    if (!review) return;
    seenRef.current = review.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }));
    setAccepted(true);
  };

  const confirm = async () => {
    if (!review || !accepted || inFlight.current) return;
    inFlight.current = true;
    setConfirming(true);
    setFailure(null);
    try {
      const result = await api.post<{ order: OrderView }>('/api/checkout', {
        ...request,
        idempotencyKey,
        expectedFingerprint: review.fingerprint,
      });
      // Stays "confirming" on the way out: nothing here may be pressed again.
      onPlaced(result.order);
    } catch (caught) {
      inFlight.current = false;
      setConfirming(false);
      if (caught instanceof ApiError && caught.status === 422 && caught.fields) {
        requestClose(true);
        onInvalidDetails(caught.message, caught.fields);
        return;
      }
      if (caught instanceof ApiError && caught.code === 'review_changed') {
        // Show what moved, measured against what they accepted.
        await loadReview();
        setFailure({ message: caught.message, retry: 'review' });
        return;
      }
      const network = !(caught instanceof ApiError) || caught.status === 0 || caught.status >= 500;
      setFailure({
        message: network ? t('review.networkError') : caught.message,
        // A lost response may have placed the order: retrying the same key
        // either places it or returns the one already placed. A refusal is
        // about the order itself, so look at it again instead.
        retry: network ? 'confirm' : 'review',
      });
    }
  };

  const total = review?.totals.total ?? 0;
  const etaText = review?.delivery ? formatDeliveryWindow(review.delivery, locale) : null;
  const confirmBlocked = !review || loading || !accepted;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[80] flex items-end justify-center [-webkit-tap-highlight-color:transparent] md:items-center md:p-6',
        closing && 'pointer-events-none',
      )}
    >
      {/* Pointer-only: keyboard users have Escape and the close button. */}
      <div
        aria-hidden="true"
        onClick={() => requestClose()}
        className={cn(
          'absolute inset-0 bg-carbon-950/50 backdrop-blur-sm',
          closing ? 'animate-backdrop-out' : 'animate-backdrop-in',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading || confirming || undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.5rem] border border-ink-100/70 bg-surface/85 shadow-overlay backdrop-blur-xl backdrop-saturate-150 outline-none md:max-h-[88dvh] md:max-w-xl md:rounded-card',
          closing ? 'animate-sheet-out md:animate-modal-out' : 'animate-sheet-in md:animate-modal-in',
        )}
      >
        <span aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink-200 md:hidden" />
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3 md:pt-5">
          <h2 id={titleId} className="text-lg font-extrabold text-ink-900">
            {t('review.title')}
          </h2>
          <button
            type="button"
            onClick={() => requestClose()}
            disabled={confirming}
            aria-label={t('common.close')}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 disabled:opacity-40"
          >
            <CloseIcon className="text-xl" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-4">
          {loading && !review ? (
            <ReviewSkeleton label={t('review.loading')} />
          ) : loadFailure ? (
            <div role="alert" className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-ink-800">
              <p className="flex items-start gap-2 font-semibold">
                <AlertIcon className="mt-0.5 shrink-0 text-base text-danger-500" />
                {loadFailure}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadReview()}>
                {t('review.tryAgain')}
              </Button>
            </div>
          ) : review ? (
            <>
              <section aria-labelledby={`${titleId}-items`}>
                <h3 id={`${titleId}-items`} className="mb-2 text-sm font-bold text-ink-900">
                  {t('review.items')}
                </h3>
                <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100 bg-surface/70">
                  {review.lines.map((line) => (
                    <li key={lineKey(line)} className="flex gap-3 p-3">
                      <Thumb image={line.image} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="line-clamp-2 font-semibold text-ink-900">{pick(line.name, line.nameTa)}</p>
                        {line.variantName ? <p className="text-xs text-ink-500">{line.variantName}</p> : null}
                        <p className="mt-0.5 text-xs tabular-nums text-ink-500">
                          {t('review.qtyPrice', { qty: line.quantity, price: formatINR(line.unitPrice) })}
                        </p>
                        {line.changes.map((change) => (
                          <p
                            key={change.type}
                            className={cn(
                              'mt-1.5 inline-flex items-start gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold',
                              accepted ? 'bg-ink-100 text-ink-600' : 'bg-warning-50 text-warning-500',
                            )}
                          >
                            <AlertIcon className="mt-px shrink-0 text-sm" />
                            {change.type === 'price'
                              ? t('review.priceChanged', {
                                  before: formatINR(change.previousUnitPrice),
                                  after: formatINR(line.unitPrice),
                                })
                              : t('review.qtyChanged', { qty: line.quantity, before: change.previousQuantity })}
                          </p>
                        ))}
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-ink-900">{formatINR(line.lineTotal)}</p>
                    </li>
                  ))}
                  {review.removed.map((gone) => {
                    const details = seenDetails.get(lineKey(gone));
                    return (
                      <li key={`gone-${lineKey(gone)}`} className="flex gap-3 p-3 opacity-80">
                        <Thumb image={details?.image ?? null} muted />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="line-clamp-2 font-semibold text-ink-500 line-through">
                            {details ? pick(details.name, details.nameTa) : '—'}
                          </p>
                          <p
                            className={cn(
                              'mt-1.5 inline-flex items-start gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold',
                              accepted ? 'bg-ink-100 text-ink-600' : 'bg-danger-50 text-danger-600',
                            )}
                          >
                            <AlertIcon className="mt-px shrink-0 text-sm" />
                            {t('review.removed')}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section aria-labelledby={`${titleId}-summary`} className="rounded-xl border border-ink-100 bg-surface/70 p-3.5 text-sm">
                <h3 id={`${titleId}-summary`} className="sr-only">
                  {t('review.summary')}
                </h3>
                <dl className="space-y-1.5 tabular-nums">
                  <SummaryRow label={t('cart.subtotal')} value={formatINR(review.totals.subtotal)} />
                  <SummaryRow
                    label={t('cart.shipping')}
                    value={review.totals.shippingFee === 0 ? t('cart.shippingFree') : formatINR(review.totals.shippingFee)}
                  />
                  {review.coupon && review.totals.couponDiscount > 0 ? (
                    <SummaryRow
                      label={t('cart.couponDiscount', { code: review.coupon.code })}
                      value={`−${formatINR(review.totals.couponDiscount)}`}
                      tone="success"
                    />
                  ) : null}
                  <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-2 text-base">
                    <dt className="font-bold text-ink-900">{t('review.grandTotal')}</dt>
                    <dd className="font-extrabold text-ink-900">{formatINR(total)}</dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby={`${titleId}-address`} className="rounded-xl border border-ink-100 bg-surface/70 p-3.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 id={`${titleId}-address`} className="flex items-center gap-2 font-bold text-ink-900">
                    <MapPinIcon className="text-base text-link" />
                    {t('review.address')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onEditAddress();
                      requestClose();
                    }}
                    disabled={confirming}
                    className="-my-2 min-h-11 rounded-full px-3 text-sm font-semibold text-link hover:underline disabled:opacity-40"
                  >
                    {t('review.edit')}
                  </button>
                </div>
                <p className="mt-1 font-semibold text-ink-800">
                  {review.address.name} · {review.address.phone}
                </p>
                <p className="mt-0.5 leading-relaxed text-ink-600">
                  {[
                    review.address.line1,
                    review.address.line2,
                    review.address.city,
                    review.address.district,
                    `${review.address.state} ${review.address.pincode}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </section>

              <section className="rounded-xl border border-ink-100 bg-surface/70 p-3.5 text-sm">
                <h3 className="font-bold text-ink-900">{t('review.payment')}</h3>
                <p className="mt-1 text-ink-700">{t('review.codLine', { amount: formatINR(total) })}</p>
                {etaText ? (
                  <p className="mt-2.5 flex items-start gap-2 border-t border-ink-100 pt-2.5 text-ink-700">
                    <TruckIcon className="mt-0.5 shrink-0 text-base text-link" />
                    <span>
                      <span className="font-semibold">{t('review.eta')}:</span> {etaText}
                    </span>
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </div>

        <footer
          className="shrink-0 space-y-3 border-t border-ink-100 px-5 pt-3"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {review && !accepted ? (
            <div role="status" className="rounded-xl border border-warning-500/30 bg-warning-50 p-3 text-sm">
              <p className="font-bold text-ink-900">{t('review.changedTitle')}</p>
              <p className="mt-0.5 text-ink-600">{t('review.changedBody')}</p>
              <Button variant="secondary" size="sm" className="mt-2.5" onClick={acceptUpdates}>
                {t('review.accept')}
              </Button>
            </div>
          ) : null}

          {failure ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm">
              <p className="flex min-w-0 flex-1 items-start gap-2 text-ink-800">
                <AlertIcon className="mt-0.5 shrink-0 text-base text-danger-500" />
                {failure.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (failure.retry === 'confirm' ? void confirm() : void loadReview())}
              >
                {t('review.tryAgain')}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <Button
              size="lg"
              fullWidth
              loading={confirming}
              disabled={confirmBlocked}
              onClick={() => void confirm()}
            >
              {confirming ? t('review.confirming') : t('review.confirm')}
              {!confirming && review ? <span className="tabular-nums">· {formatINR(total)}</span> : null}
            </Button>
            <Button size="lg" variant="outline" onClick={onEditCart} disabled={confirming}>
              {t('review.editCart')}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Thumb({ image, muted = false }: { image: CartItemView['image']; muted?: boolean }) {
  return (
    <span
      className={cn(
        'relative size-14 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50',
        muted && 'grayscale',
      )}
    >
      {image ? <Image src={image.url} alt="" fill sizes="56px" className="object-cover" /> : null}
    </span>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className={cn('font-semibold text-ink-900', tone === 'success' && 'text-success-600')}>{value}</dd>
    </div>
  );
}

function ReviewSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      <Skeleton className="h-4 w-20" />
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

/** "Thu, 23 Oct – Sat, 25 Oct", or one date when the window is a single day. */
function formatDeliveryWindow(delivery: { earliest: string; latest: string }, locale: string): string {
  const format = new Intl.DateTimeFormat(locale === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    // The keys are calendar dates, read as midnight UTC: format them in UTC
    // so no zone can move them to the day before.
    timeZone: 'UTC',
  });
  const earliest = format.format(new Date(`${delivery.earliest}T00:00:00Z`));
  const latest = format.format(new Date(`${delivery.latest}T00:00:00Z`));
  return earliest === latest ? earliest : `${earliest} – ${latest}`;
}
