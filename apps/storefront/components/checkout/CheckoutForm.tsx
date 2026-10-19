'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { AddressView, CartView, OrderView, SessionUser } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { INDIAN_STATES } from '@/lib/india';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useCart } from '@/components/providers/CartProvider';
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
import { OnlinePaymentSoonDialog } from './OnlinePaymentSoonDialog';
import { OrderReviewSheet, type CheckoutRequest } from './OrderReviewSheet';
import { usePresence } from '@/hooks/usePresence';
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
 * Where the shopper is once the order is placed: on the way to its page.
 * Placing itself happens in the review sheet, which shows its own progress.
 */
type Phase = 'idle' | 'leaving';

export function CheckoutForm({
  cart,
  user,
  addresses,
}: {
  cart: CartView;
  user: SessionUser | null;
  addresses: AddressView[];
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
  // Online payment is "coming soon": its option opens a dialog instead of
  // being selectable, so every order is placed as cash on delivery.
  const [onlineInfoOpen, setOnlineInfoOpen] = useState(false);
  const onlineButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const offline = !useOnlineStatus();

  // "Place order" opens the review; only "Confirm order" in it places
  // anything. The request is fixed when the review opens.
  const [reviewRequest, setReviewRequest] = useState<CheckoutRequest | null>(null);
  // The review animates out after closing, still showing what it showed.
  const review = usePresence(reviewRequest !== null);
  const [shownRequest, setShownRequest] = useState<CheckoutRequest | null>(null);
  // Each opening is its own sheet, with its own idempotency key — even one
  // reopened while the last is still animating away.
  const [openings, setOpenings] = useState(0);
  if (reviewRequest && reviewRequest !== shownRequest) {
    setShownRequest(reviewRequest);
    setOpenings(openings + 1);
  }
  const placeOrderRef = useRef<HTMLButtonElement>(null);
  const addressRef = useRef<HTMLFieldSetElement>(null);
  // Where focus goes when the review closes: back to "Place order", unless
  // the shopper asked to edit the address.
  const reviewReturnFocus = useRef<HTMLElement | null>(null);

  // The page stays mounted until the confirmation page has actually arrived,
  // and this is how long that takes. The overlay is held up until then so the
  // shopper is never dropped back onto a live checkout form for a beat.
  const [navigating, startNavigation] = useTransition();

  const busy = phase !== 'idle' || navigating;


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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (reviewRequest || busy) return;
    setError(null);
    setFields({});

    if (!navigator.onLine) {
      setError(t('checkout.offline'));
      return;
    }

    reviewReturnFocus.current = placeOrderRef.current;
    setReviewRequest({
      ...form,
      couponCode: cart.coupon?.code ?? '',
      paymentMethod: 'COD',
      saveAddress: saveAddress && Boolean(user),
    });
  };

  const closeReview = useCallback(() => setReviewRequest(null), []);

  /** The details themselves need fixing: say so on the form, where they are. */
  const showDetailsProblem = useCallback(
    (message: string, problems: Record<string, string>) => {
      setReviewRequest(null);
      setError(message);
      setFields(problems);
      // Scroll the error into view; on a phone the button is far from the top.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  const orderPlaced = useCallback(
    (order: OrderView) => {
      // The order exists. The server emptied the cart as part of placing it,
      // so the badge and every "in your cart" button must forget it now.
      clearCartState();
      setPhase('leaving');
      // Replaces the review's history entry, so back from the order page
      // comes to the checkout, not to a review of an order already placed.
      startNavigation(() =>
        router.replace(
          `/order/${order.orderNumber}?placed=1&email=${encodeURIComponent(order.customerEmail)}`,
        ),
      );
    },
    [clearCartState, router],
  );

  const overlayCopy: Record<Exclude<Phase, 'idle'>, { message: string; detail: string }> = {
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
      ref={formRef}
      onSubmit={submit}
      noValidate
      aria-busy={busy || undefined}
      className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8"
    >
      {overlay ? (
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
        <fieldset ref={addressRef} className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
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
              checked
              icon={<TruckIcon />}
              title={t('checkout.payment.cod')}
              body={t('checkout.payment.codBody')}
            />
            {/* Looks like the other option, but is a button: it explains,
                and never selects a way of paying the shop cannot take. */}
            <button
              ref={onlineButtonRef}
              type="button"
              onClick={() => setOnlineInfoOpen(true)}
              aria-haspopup="dialog"
              className="flex w-full items-start gap-3 rounded-xl border border-ink-200 p-3.5 text-left transition-colors hover:border-ink-300"
            >
              <span
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 rounded-full border border-ink-300 bg-surface"
              />
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-lg text-link">
                <ShieldIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">
                  {t('checkout.payment.online')}
                </span>
                <span className="mt-0.5 block text-sm text-ink-500">
                  {t('checkout.payment.onlineBody')}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">
                {t('checkout.payment.soon')}
              </span>
            </button>
          </div>
        </fieldset>

        <OnlinePaymentSoonDialog
          open={onlineInfoOpen}
          onClose={() => setOnlineInfoOpen(false)}
          onChooseCod={() => {
            setOnlineInfoOpen(false);
            // Cash on delivery is already the selected method; carry on
            // exactly as if Place order had been pressed.
            formRef.current?.requestSubmit();
          }}
          returnFocusRef={onlineButtonRef}
          phone={shopConfig.supportPhone}
        />

        {review.mounted && shownRequest ? (
          <OrderReviewSheet
            key={openings}
            request={shownRequest}
            closing={review.closing}
            cartItems={cart.items}
            returnFocusRef={reviewReturnFocus}
            onClose={closeReview}
            onEditAddress={() => {
              reviewReturnFocus.current =
                addressRef.current?.querySelector<HTMLElement>(
                  'input:not([type=radio]):not([type=checkbox])',
                ) ?? placeOrderRef.current;
            }}
            onEditCart={() => router.replace('/cart')}
            onInvalidDetails={showDetailsProblem}
            onPlaced={orderPlaced}
          />
        ) : null}

        {/* Mobile order total + submit */}
        <div className="lg:hidden">
          <OrderItems cart={cart} />
        </div>

        <Button
          ref={placeOrderRef}
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
  icon,
  title,
  body,
}: {
  checked: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
        checked ? 'border-brand-500 bg-success-50' : 'border-ink-200 hover:border-ink-300',
      )}
    >
      <input
        type="radio"
        name="paymentMethod"
        checked={checked}
        readOnly
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
