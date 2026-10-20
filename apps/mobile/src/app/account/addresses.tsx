import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { AddressView } from '@tamizh/core/types';
import { Field, FormMessage } from '@/components/Field';
import { ListSkeleton } from '@/components/Skeleton';
import { AppText, Button, ErrorState } from '@/components/ui';
import {
  useAddAddress,
  useAddressBook,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/lib/account';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

const EMPTY = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  district: '',
  state: 'Tamil Nadu',
  pincode: '',
};

/** The address book: the default first, set another as default, remove, add. */
export default function AddressesScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const addresses = useAddressBook();
  const [adding, setAdding] = useState(false);

  if (!user) return <Redirect href="/signin" />;
  if (addresses.isPending) return <ListSkeleton count={2} height={140} />;
  if (addresses.isError) {
    return <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />;
  }

  const list = [...addresses.data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const showForm = adding || list.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: t('account.addresses') }} />
      <ScrollView
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {list.length === 0 ? <AppText tone="muted">{t('account.noAddresses')}</AppText> : null}
        {list.map((address) => (
          <AddressCard key={address.id} address={address} />
        ))}

        {showForm ? (
          <AddressForm
            first={list.length === 0}
            onDone={() => setAdding(false)}
            onCancel={list.length > 0 ? () => setAdding(false) : undefined}
          />
        ) : (
          <Button
            label={t('account.addAddress')}
            variant="outline"
            onPress={() => setAdding(true)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AddressCard({ address }: { address: AddressView }) {
  const { t } = useLocale();
  const colors = useColors();
  const remove = useDeleteAddress();
  const makeDefault = useSetDefaultAddress();
  const busy = remove.isPending || makeDefault.isPending;

  const confirmRemove = () =>
    Alert.alert(t('common.delete'), `${address.line1}, ${address.city}`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(address.id) },
    ]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: address.isDefault ? colors.accentSoft : colors.surface,
          borderColor: address.isDefault ? colors.action : colors.border,
        },
      ]}
    >
      <View style={styles.cardHead}>
        <AppText style={[styles.bold, styles.flex]}>{address.fullName}</AppText>
        {address.isDefault ? (
          <View style={[styles.badge, { backgroundColor: colors.action }]}>
            <AppText variant="label" style={{ color: colors.onAction }}>
              {t('account.default')}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText tone="muted">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}
        {'\n'}
        {address.city}, {address.district}
        {'\n'}
        {address.state} — {address.pincode}
        {'\n'}
        {address.phone}
      </AppText>
      <View style={styles.actions}>
        {!address.isDefault ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => makeDefault.mutate(address.id)}
            hitSlop={8}
          >
            <AppText tone="link" style={styles.bold}>
              {t('account.setDefault')}
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('common.delete')} ${address.line1}`}
          disabled={busy}
          onPress={confirmRemove}
          style={styles.remove}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <AppText tone="danger" style={styles.bold}>
            {t('common.delete')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function AddressForm({
  first,
  onDone,
  onCancel,
}: {
  first: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const add = useAddAddress();
  const [form, setForm] = useState(EMPTY);
  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const fields = add.error instanceof ApiError ? (add.error.fields ?? {}) : {};

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="heading">{t('account.addAddress')}</AppText>
      <Field
        label={t('checkout.contact.name')}
        value={form.fullName}
        onChangeText={set('fullName')}
        autoComplete="name"
        error={fields.fullName}
      />
      <Field
        label={t('checkout.contact.phone')}
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={fields.phone}
      />
      <Field
        label={t('checkout.address.line1')}
        value={form.line1}
        onChangeText={set('line1')}
        autoComplete="address-line1"
        error={fields.line1}
      />
      <Field
        label={t('checkout.address.line2')}
        optionalLabel={t('common.optional')}
        value={form.line2}
        onChangeText={set('line2')}
        autoComplete="address-line2"
      />
      <Field
        label={t('checkout.address.city')}
        value={form.city}
        onChangeText={set('city')}
        error={fields.city}
      />
      <Field
        label={t('checkout.address.district')}
        value={form.district}
        onChangeText={set('district')}
        error={fields.district}
      />
      <Field
        label={t('checkout.address.state')}
        value={form.state}
        onChangeText={set('state')}
        error={fields.state}
      />
      <Field
        label={t('checkout.address.pincode')}
        value={form.pincode}
        onChangeText={set('pincode')}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="postal-code"
        error={fields.pincode}
      />
      {add.error && Object.keys(fields).length === 0 ? (
        <FormMessage text={add.error instanceof ApiError ? add.error.message : t('error.body')} />
      ) : null}
      <View style={styles.formActions}>
        {onCancel ? (
          <View style={styles.flex}>
            <Button label={t('common.cancel')} variant="outline" onPress={onCancel} />
          </View>
        ) : null}
        <View style={styles.flex}>
          <Button
            label={t('common.save')}
            loading={add.isPending}
            onPress={() =>
              add.mutate(
                { ...form, line2: form.line2 || undefined, isDefault: first },
                {
                  onSuccess: () => {
                    setForm(EMPTY);
                    onDone();
                  },
                },
              )
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: radius.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.xs },
  remove: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  formActions: { flexDirection: 'row', gap: spacing.md },
  bold: { fontWeight: '700' },
});
