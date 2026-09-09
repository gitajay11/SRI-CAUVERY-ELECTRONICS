'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CartView } from '@tamizh/core/types';
import { formatINR } from '@tamizh/core/money';
import { cn } from '@tamizh/core/utils';
import { ApiError, api } from '@/lib/http';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CheckIcon, CloseIcon, ShieldIcon, TagIcon, TruckIcon } from '@/components/ui/Icons';

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
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
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
            className="mt-3 block text-center text-sm font-semibold text-brand-700 hover:underline"
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

function CouponForm({ cart }: { cart: CartView }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-surface"
        >
          <CloseIcon />
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
          await api.post('/api/cart/coupon', { code });
          toast(t('cart.couponApplied', { code: code.toUpperCase() }));
          setCode('');
          router.refresh();
        } catch (caught) {
          setError(caught instanceof ApiError ? caught.message : t('error.body'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="coupon" className="text-sm font-semibold text-ink-700">
        {t('cart.coupon')}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={t('cart.couponPlaceholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-brand-500"
        />
        <Button type="submit" variant="outline" loading={busy} disabled={code.length < 3}>
          {t('common.apply')}
        </Button>
      </div>
      {error ? (
        <p id="coupon-error" role="alert" className="mt-1.5 text-sm text-danger-500">
          {error}
        </p>
      ) : null}
    </form>
  );
}
