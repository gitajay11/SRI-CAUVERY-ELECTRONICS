'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { AddressView, CartView, OrderView, SessionUser } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { INDIAN_STATES } from '@/lib/india';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useCart } from '@/components/providers/CartProvider';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import { shopConfig } from '@/lib/site';
import { Button } from '@/components/ui/Button';
import {
  CheckboxField,
  FormError,
  PhoneField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/Field';
import { CartSummary } from '@/components/cart/CartSummary';
import { Alert, LoadingState } from '@/components/ui/Primitives';
import { CheckIcon, ShieldIcon, TruckIcon, WifiOffIcon } from '@/components/ui/Icons';

/**
 * Checkout.
 *
 * One page rather than a wizard: on a phone, three screens with a progress bar
 * is more taps and more places to lose people than a single well-grouped form.
 *
 * Validation is mirrored — HTML constraints for instant feedback, zod on the
 * server for the decision that counts. The order total is never sent; the
 * server recomputes it from the cart.
 */
/**
 * Where the shopper is in placing the order. Each phase has its own words on
 * the screen, because "please wait" means something different when the order
 * is being written, when the payment window is open, and when the payment is
 * being checked with the gateway.
 */
type Phase = 'idle' | 'placing' | 'paying' | 'confirming' | 'leaving';

export function CheckoutForm({
  cart,
  user,
  addresses,
  onlinePaymentAvailable,
}: {
  cart: CartView;
  user: SessionUser | null;
  addresses: AddressView[];
  onlinePaymentAvailable: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { clear: clearCartState } = useCart();

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress?.id ?? 'new',
  );
  const [form, setForm] = useState({
    customerName: defaultAddress?.fullName ?? user?.name ?? '',
    customerEmail: user?.email ?? '',
    customerPhone: defaultAddress?.phone ?? user?.phone ?? '',
    addressLine1: defaultAddress?.line1 ?? '',
    addressLine2: defaultAddress?.line2 ?? '',
    city: defaultAddress?.city ?? '',
    district: defaultAddress?.district ?? '',
    state: defaultAddress?.state ?? 'Tamil Nadu',
    pincode: defaultAddress?.pincode ?? '',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [saveAddress, setSaveAddress] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const offline = !useOnlineStatus();

  // The page stays mounted until the confirmation page has actually arrived,
  // and this is how long that takes. The overlay is held up until then so the
  // shopper is never dropped back onto a live checkout form for a beat.
  const [navigating, startNavigation] = useTransition();

  // A second tap can land before the disabled state has rendered. State is
  // for what the screen shows; this ref is what actually stops a second
  // order being placed.
  const inFlight = useRef(false);

  const busy = phase !== 'idle' || navigating;

  /** Leaves the form for the order page, keeping the overlay up until it lands. */
  const leaveFor = (href: string) => {
    startNavigation(() => router.push(href));
  };

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const applySavedAddress = (address: AddressView) => {
    setSelectedAddressId(address.id);
    setForm((current) => ({
      ...current,
      customerName: address.fullName,
      customerPhone: address.phone,
      addressLine1: address.line1,
      addressLine2: address.line2 ?? '',
      city: address.city,
      district: address.district,
      state: address.state,
      pincode: address.pincode,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    setError(null);
    setFields({});

    if (!navigator.onLine) {
      setError(t('checkout.offline'));
      return;
    }

    inFlight.current = true;
    setPhase('placing');
    try {
      const result = await api.post<{
        order: OrderView;
        payment: Record<string, string | number> | null;
      }>('/api/checkout', {
        ...form,
        couponCode: cart.coupon?.code ?? '',
        paymentMethod,
        saveAddress: saveAddress && Boolean(user),
      });

      // The order exists. The server emptied the cart as part of placing it,
      // so the badge and every "in your cart" button must forget it now —
      // whatever happens with payment, these goods are no longer in a cart.
      clearCartState();

      // Everything from here is about that one order: its total is already
      // fixed on the server, so nothing the gateway or the browser says can
      // change what is owed.
      if (result.payment?.provider === 'razorpay') {
        const pending = `/order/${result.order.orderNumber}?payment=pending&email=${encodeURIComponent(result.order.customerEmail)}`;

        setPhase('paying');
        let outcome: Awaited<ReturnType<typeof openRazorpayCheckout>>;
        try {
          outcome = await openRazorpayCheckout(
            {
              key: String(result.payment.key),
              amount: Number(result.payment.amount),
              currency: String(result.payment.currency),
              razorpayOrderId: String(result.payment.razorpayOrderId),
              orderNumber: result.order.orderNumber,
            },
            {
              name: form.customerName,
              email: form.customerEmail,
              phone: form.customerPhone,
              shopName: shopConfig.nameEn,
            },
          );
        } catch {
          // The script could not load — a blocked third party, or no network.
          // The order stands; it simply has not been paid for yet.
          setError(t('checkout.payment.gatewayUnavailable'));
          setPhase('idle');
          inFlight.current = false;
          return;
        }

        if (outcome.status === 'paid') {
          // The gateway says paid; the shop has not agreed yet. Until the
          // server has checked the signature nothing on screen may say
          // "confirmed" — this phase is the honest state in between.
          setPhase('confirming');
          try {
            await api.post('/api/payments/verify', outcome.handshake);
            leaveFor(
              `/order/${result.order.orderNumber}?placed=1&email=${encodeURIComponent(result.order.customerEmail)}`,
            );
          } catch {
            // Money may well have left the shopper's account, so this must
            // never read as "payment failed". The order page is the honest
            // place for it: the shop can see the payment and reconcile.
            leaveFor(`${pending}&verify=failed`);
          }
          return;
        }

        // Dismissed or declined. Recorded so the order does not sit in
        // PENDING with nothing said about why, and best-effort because
        // failing to record a failure must not lose the order.
        void api
          .post('/api/payments/verify', {
            failed: true,
            razorpay_order_id: String(result.payment.razorpayOrderId),
            reason:
              outcome.status === 'failed' ? outcome.reason : 'Payment window closed',
          })
          .catch(() => {});

        setPhase('leaving');
        leaveFor(pending);
        return;
      }

      setPhase('leaving');
      if (result.payment) {
        // Any other online provider — the mock one in development — has no
        // browser step, so the order simply waits for confirmation.
        leaveFor(
          `/order/${result.order.orderNumber}?payment=pending&email=${encodeURIComponent(result.order.customerEmail)}`,
        );
        return;
      }

      leaveFor(
        `/order/${result.order.orderNumber}?placed=1&email=${encodeURIComponent(result.order.customerEmail)}`,
      );
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
        if (caught.code === 'insufficient_stock' || caught.code === 'empty_cart') {
          router.refresh();
        }
      } else {
        setError(t('checkout.errorGeneric'));
      }
      // Scroll the error into view; on a phone the button is far from the top.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Released only on failure. A successful order is leaving this page,
      // and nothing must be allowed to place a second one on the way out.
      setPhase('idle');
      inFlight.current = false;
    }
  };

  const overlayCopy: Record<Exclude<Phase, 'idle'>, { message: string; detail: string }> = {
    placing: {
      message: t('checkout.wait.placing'),
      detail: t('checkout.wait.placingDetail'),
    },
    paying: {
      message: t('checkout.wait.paying'),
      detail: t('checkout.wait.payingDetail'),
    },
    confirming: {
      message: t('checkout.wait.confirming'),
      detail: t('checkout.wait.confirmingDetail'),
    },
    leaving: {
      message: t('checkout.wait.leaving'),
      detail: t('checkout.wait.leavingDetail'),
    },
  };
  // Once the order is placed the overlay stays until the next page arrives;
  // the form underneath must not come back to life for a beat in between.
  const overlay = phase !== 'idle' ? overlayCopy[phase] : navigating ? overlayCopy.leaving : null;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={busy || undefined}
      className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8"
    >
      {/* The payment window is the gateway's own; while it is open ours
          stays out of the way so nothing here can be read as competing. */}
      {overlay && phase !== 'paying' ? (
        <LoadingState overlay message={overlay.message} detail={overlay.detail} />
      ) : null}

      <div className="space-y-6">
        {offline ? (
          <Alert tone="warning" icon={<WifiOffIcon />}>
            {t('checkout.offline')}
          </Alert>
        ) : null}

        {error ? <FormError>{error}</FormError> : null}

        {/* Contact */}
        <fieldset className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
          <legend className="px-1 text-base font-bold text-ink-900">
            {t('checkout.steps.contact')}
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('checkout.contact.name')}
              value={form.customerName}
              onChange={(event) => set('customerName')(event.target.value)}
              autoComplete="name"
              required
              error={fields.customerName}
            />
            <PhoneField
              label={t('checkout.contact.phone')}
              value={form.customerPhone}
              onChange={set('customerPhone')}
              placeholder="90000 00000"
              hint={t('checkout.contact.phoneHint')}
              required
              error={fields.customerPhone}
            />
            <div className="sm:col-span-2">
              <TextField
                label={t('checkout.contact.email')}
                value={form.customerEmail}
                onChange={(event) => set('customerEmail')(event.target.value)}
                type="email"
                autoComplete="email"
                required
                error={fields.customerEmail}
              />
            </div>
          </div>
        </fieldset>

        {/* Address */}
        <fieldset className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
          <legend className="px-1 text-base font-bold text-ink-900">
            {t('checkout.steps.address')}
          </legend>

          {addresses.length > 0 ? (
            <div className="mb-4 mt-3 space-y-2">
              <p className="text-sm font-semibold text-ink-700">
                {t('checkout.address.saved')}
              </p>
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                    selectedAddressId === address.id
                      ? 'border-brand-500 bg-success-50'
                      : 'border-ink-200 hover:border-ink-300',
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedAddressId === address.id}
                    onChange={() => applySavedAddress(address)}
                    className="mt-1 size-4 accent-brand-600"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold text-ink-900">
                      {address.fullName} · {address.phone}
                    </span>
                    <span className="mt-0.5 block text-ink-600">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}, {address.city},{' '}
                      {address.district}, {address.state} {address.pincode}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition-colors',
                  selectedAddressId === 'new'
                    ? 'border-brand-500 bg-success-50'
                    : 'border-ink-200 hover:border-ink-300',
                )}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  checked={selectedAddressId === 'new'}
                  onChange={() => setSelectedAddressId('new')}
                  className="size-4 accent-brand-600"
                />
                {t('checkout.address.useNew')}
              </label>
            </div>
          ) : null}

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label={t('checkout.address.line1')}
                value={form.addressLine1}
                onChange={(event) => set('addressLine1')(event.target.value)}
                autoComplete="address-line1"
                required
                error={fields.addressLine1}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label={t('checkout.address.line2')}
                value={form.addressLine2}
                onChange={(event) => set('addressLine2')(event.target.value)}
                autoComplete="address-line2"
                optionalLabel={t('common.optional')}
                error={fields.addressLine2}
              />
            </div>
            <TextField
              label={t('checkout.address.city')}
              value={form.city}
              onChange={(event) => set('city')(event.target.value)}
              autoComplete="address-level2"
              required
              error={fields.city}
            />
            <TextField
              label={t('checkout.address.district')}
              value={form.district}
              onChange={(event) => set('district')(event.target.value)}
              autoComplete="address-level3"
              required
              error={fields.district}
            />
            <SelectField
              label={t('checkout.address.state')}
              value={form.state}
              onChange={(event) => set('state')(event.target.value)}
              autoComplete="address-level1"
              required
              error={fields.state}
            >
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </SelectField>
            <TextField
              label={t('checkout.address.pincode')}
              value={form.pincode}
              onChange={(event) => set('pincode')(event.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              required
              error={fields.pincode}
            />
          </div>

          {user ? (
            <div className="mt-4">
              <CheckboxField
                label={t('checkout.address.saveForLater')}
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
              />
            </div>
          ) : null}

          <div className="mt-4">
            <TextAreaField
              label={t('checkout.notes', { optional: t('common.optional') })}
              value={form.notes}
              onChange={(event) => set('notes')(event.target.value)}
              placeholder={t('checkout.notesPlaceholder')}
              rows={3}
              maxLength={500}
            />
          </div>
        </fieldset>

        {/* Payment */}
        <fieldset className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
          <legend className="px-1 text-base font-bold text-ink-900">
            {t('checkout.payment.title')}
          </legend>

          <div className="mt-3 space-y-2.5">
            <PaymentOption
              checked={paymentMethod === 'COD'}
              onSelect={() => setPaymentMethod('COD')}
              icon={<TruckIcon />}
              title={t('checkout.payment.cod')}
              body={t('checkout.payment.codBody')}
            />
            <PaymentOption
              checked={paymentMethod === 'ONLINE'}
              onSelect={() => setPaymentMethod('ONLINE')}
              disabled={!onlinePaymentAvailable}
              icon={<ShieldIcon />}
              title={t('checkout.payment.online')}
              body={
                onlinePaymentAvailable
                  ? t('checkout.payment.onlineBody')
                  : t('checkout.payment.onlineUnavailable')
              }
            />
          </div>
        </fieldset>

        {/* Mobile order total + submit */}
        <div className="lg:hidden">
          <OrderItems cart={cart} />
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={busy}
          disabled={offline || cart.items.length === 0}
        >
          {busy
            ? t('checkout.placing')
            : `${t('checkout.placeOrder')} · ${formatINR(cart.totals.total)}`}
        </Button>
      </div>

      <div className="lg:sticky lg:top-40 lg:space-y-4">
        <div className="hidden lg:block">
          <OrderItems cart={cart} />
        </div>
        <CartSummary cart={cart} showCheckoutButton={false} />
      </div>
    </form>
  );
}

function PaymentOption({
  checked,
  onSelect,
  disabled = false,
  icon,
  title,
  body,
}: {
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
        disabled && 'cursor-not-allowed opacity-60',
        checked ? 'border-brand-500 bg-success-50' : 'border-ink-200 hover:border-ink-300',
      )}
    >
      <input
        type="radio"
        name="paymentMethod"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="mt-1 size-4 accent-brand-600"
      />
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-lg text-link">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink-900">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-500">{body}</span>
      </span>
      {checked ? <CheckIcon className="ml-auto text-lg text-link" /> : null}
    </label>
  );
}

function OrderItems({ cart }: { cart: CartView }) {
  const { t, pick } = useLocale();
  return (
    <section className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
      <h2 className="mb-3 text-base font-bold text-ink-900">
        {t('checkout.orderSummary')}
      </h2>
      <ul className="space-y-3">
        {cart.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
              {item.image ? (
                <Image
                  src={item.image.url}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-carbon-900 text-[0.65rem] font-bold text-white">
                {item.quantity}
              </span>
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="line-clamp-1 font-medium text-ink-900">
                {pick(item.name, item.nameTa)}
              </span>
              <span className="text-xs text-ink-400">{item.sku}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
              {formatINR(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
