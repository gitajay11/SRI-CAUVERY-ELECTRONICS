import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import { Redirect, router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { formatINR } from '@tamizh/core/money';
import type { AddressView } from '@tamizh/core/types';
import type { OrderReview } from '@shop/order-review';
import { Field, FormMessage } from '@/components/Field';
import { OrderReviewSheet } from '@/components/OrderReviewSheet';
import { AppText, Button, StateMessage } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useAddressBook } from '@/lib/account';
import {
  seenLines,
  usePlaceOrder,
  useReviewOrder,
  type CheckoutDetails,
} from '@/lib/checkout';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

const EMPTY_ADDRESS = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  state: 'Tamil Nadu',
  pincode: '',
};

function fromSaved(address: AddressView) {
  return {
    customerName: address.fullName,
    customerPhone: address.phone,
    addressLine1: address.line1,
    addressLine2: address.line2 ?? '',
    city: address.city,
    district: address.district,
    state: address.state,
    pincode: address.pincode,
  };
}

/**
 * Checkout: contact, delivery address, cash on delivery. "Place order" asks
 * the server for a review first; the order is created only from the review.
 */
export default function CheckoutScreen() {
  const { t } = useLocale();
  const { user, checking } = useAuth();
  const cart = useCart();
  const addresses = useAddressBook();

  if (checking || cart.isPending || (user && addresses.isPending)) {
    return <StateMessage loading />;
  }
  // Orders belong to an account; the cart sends signed-out shoppers to sign
  // in first, and this catches a stale screen after signing out.
  if (!user) return <Redirect href={{ pathname: '/signin', params: { next: '/checkout' } }} />;
  if (!cart.data || cart.data.items.length === 0) {
    return (
      <StateMessage
        title={t('checkout.title')}
        body={t('checkout.emptyCart')}
        action={{ label: t('cart.continueShopping'), onPress: () => router.navigate('/shop') }}
      />
    );
  }

  return <CheckoutForm addresses={addresses.data ?? []} />;
}

function CheckoutForm({ addresses }: { addresses: AddressView[] }) {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const cart = useCart();
  const review = useReviewOrder();
  const place = usePlaceOrder();

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [selected, setSelected] = useState<string>(defaultAddress?.id ?? 'new');
  const [details, setDetails] = useState<CheckoutDetails>(() => ({
    customerName: user?.name ?? '',
    customerEmail: user?.email ?? '',
    customerPhone: user?.phone ?? '',
    ...EMPTY_ADDRESS,
    ...(defaultAddress ? fromSaved(defaultAddress) : {}),
    notes: '',
    saveAddress: addresses.length === 0,
  }));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [current, setCurrent] = useState<OrderReview | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // One key per decision to buy, so a retried press is the same order.
  const idempotencyKey = useRef<string | null>(null);

  const set = (key: keyof CheckoutDetails) => (value: string) =>
    setDetails((previous) => ({ ...previous, [key]: value }));

  const choose = (id: string) => {
    setSelected(id);
    const address = addresses.find((candidate) => candidate.id === id);
    setDetails((previous) => ({
      ...previous,
      ...(address
        ? fromSaved(address)
        : { ...EMPTY_ADDRESS, customerName: user?.name ?? '', customerPhone: user?.phone ?? '' }),
      saveAddress: !address,
    }));
  };

  const failed = (caught: unknown, setMessage: (message: string) => void) => {
    if (caught instanceof ApiError) {
      if (caught.code === 'sign_in_required') {
        router.replace({ pathname: '/signin', params: { next: '/checkout' } });
        return;
      }
      if (caught.fields) setFields(caught.fields);
      setMessage(caught.message);
    } else {
      setMessage(t('checkout.errorGeneric'));
    }
  };

  const openReview = () => {
    if (!cart.data) return;
    setFields({});
    setFormError(null);
    setConfirmError(null);
    review.mutate(
      { details, seen: seenLines(cart.data) },
      {
        onSuccess: (result) => {
          idempotencyKey.current = Crypto.randomUUID();
          setCurrent(result);
          setSheetOpen(true);
        },
        onError: (caught) => failed(caught, setFormError),
      },
    );
  };

  // Accepting the changes: review again, comparing against what was just shown.
  const acceptChanges = () => {
    if (!current) return;
    setConfirmError(null);
    review.mutate(
      { details, seen: current.lines },
      {
        onSuccess: setCurrent,
        onError: (caught) => failed(caught, setConfirmError),
      },
    );
  };

  const confirm = () => {
    if (!current || !idempotencyKey.current) return;
    setConfirmError(null);
    place.mutate(
      { details, fingerprint: current.fingerprint, idempotencyKey: idempotencyKey.current },
      {
        onSuccess: ({ order }) => {
          setSheetOpen(false);
          router.replace({ pathname: '/order-placed', params: { number: order.orderNumber } });
        },
        onError: (caught) => {
          // The order moved while it was being reviewed: show the new one.
          if (caught instanceof ApiError && caught.code === 'review_changed') acceptChanges();
          failed(caught, setConfirmError);
        },
      },
    );
  };

  const usingSaved = selected !== 'new';
  const total = cart.data?.totals.total ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: t('checkout.title') }} />
      <ScrollView
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Card title={t('checkout.steps.contact')}>
          <Field
            label={t('checkout.contact.name')}
            value={details.customerName}
            onChangeText={set('customerName')}
            autoComplete="name"
            error={fields.customerName}
          />
          <Field
            label={t('checkout.contact.phone')}
            value={details.customerPhone}
            onChangeText={set('customerPhone')}
            keyboardType="phone-pad"
            autoComplete="tel"
            hint={t('checkout.contact.phoneHint')}
            error={fields.customerPhone}
          />
          <Field
            label={t('checkout.contact.email')}
            value={details.customerEmail}
            onChangeText={set('customerEmail')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={fields.customerEmail}
          />
        </Card>

        <Card title={t('checkout.steps.address')}>
          {addresses.length > 0 ? (
            <View style={styles.choices} accessibilityRole="radiogroup">
              <AppText variant="small" style={styles.bold}>
                {t('checkout.address.saved')}
              </AppText>
              {addresses.map((address) => (
                <Choice
                  key={address.id}
                  selected={selected === address.id}
                  onPress={() => choose(address.id)}
                  title={`${address.fullName} · ${address.phone}`}
                  body={`${address.line1}${address.line2 ? `, ${address.line2}` : ''}, ${address.city}, ${address.district}, ${address.state} ${address.pincode}`}
                />
              ))}
              <Choice
                selected={selected === 'new'}
                onPress={() => choose('new')}
                title={t('checkout.address.useNew')}
              />
            </View>
          ) : null}

          {!usingSaved ? (
            <>
              <Field
                label={t('checkout.address.line1')}
                value={details.addressLine1}
                onChangeText={set('addressLine1')}
                autoComplete="address-line1"
                error={fields.addressLine1}
              />
              <Field
                label={t('checkout.address.line2')}
                optionalLabel={t('common.optional')}
                value={details.addressLine2}
                onChangeText={set('addressLine2')}
                autoComplete="address-line2"
              />
              <Field
                label={t('checkout.address.city')}
                value={details.city}
                onChangeText={set('city')}
                error={fields.city}
              />
              <Field
                label={t('checkout.address.district')}
                value={details.district}
                onChangeText={set('district')}
                error={fields.district}
              />
              <Field
                label={t('checkout.address.state')}
                value={details.state}
                onChangeText={set('state')}
                error={fields.state}
              />
              <Field
                label={t('checkout.address.pincode')}
                value={details.pincode}
                onChangeText={set('pincode')}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="postal-code"
                error={fields.pincode}
              />
              <View style={styles.switchRow}>
                <AppText style={styles.flex}>{t('checkout.address.saveForLater')}</AppText>
                <Switch
                  value={details.saveAddress}
                  onValueChange={(saveAddress) => setDetails((previous) => ({ ...previous, saveAddress }))}
                  trackColor={{ true: colors.action }}
                />
              </View>
            </>
          ) : fields.pincode ? (
            <AppText variant="small" tone="danger">
              {fields.pincode}
            </AppText>
          ) : null}
        </Card>

        <Card title={t('checkout.payment.title')}>
          <Choice
            selected
            onPress={() => {}}
            title={t('checkout.payment.cod')}
            body={t('checkout.payment.codBody')}
          />
          <Choice
            selected={false}
            disabled
            onPress={() => {}}
            title={t('checkout.payment.online')}
            body={t('checkout.payment.soon')}
          />
          <Field
            label={t('checkout.notes', { optional: t('common.optional') })}
            value={details.notes}
            onChangeText={set('notes')}
            placeholder={t('checkout.notesPlaceholder')}
            multiline
            style={styles.notes}
          />
        </Card>

        {formError ? <FormMessage text={formError} /> : null}

        <Button
          label={`${t('checkout.placeOrder')} · ${formatINR(total)}`}
          onPress={openReview}
          loading={review.isPending && !sheetOpen}
        />
        <View style={styles.secure}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textFaint} />
          <AppText variant="small" tone="faint">
            {t('checkout.securityNote')}
          </AppText>
        </View>
      </ScrollView>

      <OrderReviewSheet
        review={current}
        visible={sheetOpen}
        confirming={place.isPending}
        accepting={review.isPending}
        error={confirmError}
        onAccept={acceptChanges}
        onConfirm={confirm}
        onEditCart={() => {
          setSheetOpen(false);
          router.back();
        }}
        onClose={() => setSheetOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

/** A radio row: saved addresses and payment methods. */
function Choice({
  selected,
  title,
  body,
  disabled = false,
  onPress,
}: {
  selected: boolean;
  title: string;
  body?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.choice,
        {
          borderColor: selected ? colors.action : colors.borderStrong,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.link : colors.textFaint}
      />
      <View style={styles.flex}>
        <AppText style={styles.bold}>{title}</AppText>
        {body ? (
          <AppText variant="small" tone="muted">
            {body}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
  choices: { gap: spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notes: { minHeight: 80, paddingTop: spacing.md, textAlignVertical: 'top' },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  bold: { fontWeight: '700' },
});
