'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { CartView } from '@tamizh/core/types';
import { formatINR } from '@tamizh/core/money';
import { cn } from '@tamizh/core/utils';
import { ApiError, api } from '@/lib/http';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useNavigation } from '@/hooks/useNavigation';
import { useToast } from '@/components/providers/ToastProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CheckIcon, CloseIcon, ShieldIcon, TagIcon, TruckIcon, SpinnerIcon } from '@/components/ui/Icons';

/**
 * Order summary with the coupon form.
 *
 * Every figure comes from the server-priced cart; nothing here is computed in
 * the browser, so what the shopper sees is exactly what checkout will charge.
 */
export function CartSummary({
  cart,
  showCheckoutButton = true,
  className,
}: {
  cart: CartView;
  showCheckoutButton?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const { totals } = cart;
  const totalSaving = totals.productDiscount + totals.couponDiscount;

  return (
    <section
      aria-label={t('cart.summary')}
      className={cn('rounded-card border border-ink-100 bg-surface p-4 sm:p-5', className)}
    >
      <h2 className="text-base font-bold text-ink-900">{t('cart.summary')}</h2>

      <CouponForm cart={cart} />

      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label={t('cart.subtotal')} value={formatINR(totals.mrpTotal)} />
        {totals.productDiscount > 0 ? (
          <Row
            label={t('cart.productDiscount')}
            value={`-${formatINR(totals.productDiscount)}`}
            tone="success"
          />
        ) : null}
        {cart.coupon ? (
          <Row
            label={t('cart.couponDiscount', { code: cart.coupon.code })}
            value={`-${formatINR(totals.couponDiscount)}`}
            tone="success"
          />
        ) : null}
        <Row
          label={t('cart.shipping')}
          value={
            totals.shippingFee === 0 ? (
              <span className="font-bold text-success-500">{t('cart.shippingFree')}</span>
            ) : (
              formatINR(totals.shippingFee)
            )
          }
        />

        <div className="border-t border-ink-100 pt-3">
          <div className="flex items-baseline justify-between">
            <dt className="text-base font-bold text-ink-900">{t('cart.total')}</dt>
            <dd className="text-xl font-extrabold text-ink-900">
              {formatINR(totals.total)}
            </dd>
          </div>
        </div>
      </dl>

      {totalSaving > 0 ? (
        <p className="mt-3 rounded-lg bg-success-50 px-3 py-2 text-sm font-semibold text-success-500">
          {t('cart.savings', { amount: formatINR(totalSaving) })}
        </p>
      ) : null}

      {totals.freeShippingRemaining > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-link">
          <TruckIcon className="mt-0.5 shrink-0 text-base" />
          {t('cart.freeShippingProgress', {
            amount: formatINR(totals.freeShippingRemaining),
          })}
        </p>
      ) : totals.subtotal > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-500">
          <CheckIcon className="mt-0.5 shrink-0 text-base" />
          {t('cart.freeShippingReached')}
        </p>
      ) : null}

      {showCheckoutButton ? (
        <>
          <ButtonLink href="/checkout" size="lg" fullWidth className="mt-5">
            {t('cart.checkout')}
          </ButtonLink>
          <Link
            href="/shop"
            className="mt-3 block text-center text-sm font-semibold text-link hover:underline"
          >
            {t('cart.continueShopping')}
          </Link>
        </>
      ) : null}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400">
        <ShieldIcon className="text-sm" />
        {t('checkout.securityNote')}
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'success';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd
        className={cn(
          'font-semibold tabular-nums',
          tone === 'success' ? 'text-success-500' : 'text-ink-900',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The coupon box.
 *
 * Not a <form>, and that is the whole point. This summary is also rendered
 * inside the checkout — which is itself a form — and HTML does not allow a
 * form inside a form. The parser drops the inner tag, React fails to hydrate
 * what it finds, and the Apply button ends up owned by the *checkout* form:
 * tapping it submitted the checkout natively, reloaded the page, and wiped
 * every field the shopper had just typed. Their delivery details "vanished".
 *
 * A group with a button does exactly what the form did — Enter still applies
 * — without ever being able to submit anything but the coupon.
 */
function CouponForm({ cart }: { cart: CartView }) {
  const { t } = useLocale();
  const { toast } = useToast();
  // `pending` lasts until the refreshed cart has rendered, so the button
  // spins until the total it changed is on screen.
  const { refresh, pending } = useNavigation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State alone is not enough to stop a double tap: the second click can
  // arrive before React has re-rendered the button as disabled.
  const inFlight = useRef(false);

  const apply = async () => {
    if (inFlight.current || code.trim().length < 3) return;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      await api.post('/api/cart/coupon', { code });
      toast(t('cart.couponApplied', { code: code.toUpperCase() }));
      setCode('');
      // The cart is priced on the server; only it knows the new total.
      // A refresh re-renders the server tree and leaves client state —
      // every field the shopper has typed — exactly where it was.
      refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.body'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (cart.coupon) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-success-500/25 bg-success-50 px-3 py-2.5">
        <TagIcon className="shrink-0 text-base text-success-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-success-500">
            {t('cart.couponApplied', { code: cart.coupon.code })}
          </p>
          <p className="truncate text-xs text-ink-500">{cart.coupon.description}</p>
        </div>
        <button
          type="button"
          aria-label={t('cart.couponRemove')}
          onClick={async () => {
            setBusy(true);
            try {
              await api.delete('/api/cart/coupon');
              refresh();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || pending}
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-surface"
        >
          {busy || pending ? <SpinnerIcon className="text-base" /> : <CloseIcon />}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4" role="group" aria-labelledby="coupon-label">
      <label id="coupon-label" htmlFor="coupon" className="text-sm font-semibold text-ink-700">
        {t('cart.coupon')}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            // Enter applies the coupon and nothing else. Inside the checkout
            // this key would otherwise place the order.
            if (event.key === 'Enter') {
              event.preventDefault();
              void apply();
            }
          }}
          placeholder={t('cart.couponPlaceholder')}
          autoComplete="off"
          autoCapitalize="characters"
          enterKeyHint="go"
          disabled={busy}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-brand-500 disabled:opacity-60"
        />
        <Button
          type="button"
          variant="outline"
          loading={busy || pending}
          disabled={code.length < 3}
          onClick={() => void apply()}
        >
          {t('common.apply')}
        </Button>
      </div>
      {error ? (
        <p id="coupon-error" role="alert" className="mt-1.5 text-sm text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
