import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useScrollToTop } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import { CartLine } from '@/components/CartLine';
import { FormMessage } from '@/components/Field';
import { PriceSummary } from '@/components/PriceSummary';
import { AppText, Button, ErrorState, StateMessage } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApplyCoupon, useCart, useRemoveCoupon, useUpdateCartItem } from '@/lib/cart';
import { useLocale } from '@/lib/i18n';
import { useHideTabBarOnScroll, useTabBarInset } from '@/lib/tab-bar';
import { radius, spacing, useColors } from '@/theme/colors';

/** The cart: lines, coupon, the server's price summary, and the way to checkout. */
export default function CartScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const cart = useCart();
  const update = useUpdateCartItem();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const onScroll = useHideTabBarOnScroll();
  const bottomInset = useTabBarInset();

  if (cart.isPending) return <StateMessage loading />;
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />;

  const { items, totals, coupon, notices, itemCount } = cart.data;

  if (items.length === 0) {
    return (
      <View style={[styles.flex, { paddingBottom: bottomInset }]}>
        <StateMessage
          title={t('cart.empty.title')}
          body={t('cart.empty.body')}
          action={{ label: t('cart.empty.cta'), onPress: () => router.navigate('/shop') }}
        />
      </View>
    );
  }

  const checkout = () => {
    if (user) router.push('/checkout');
    else router.push({ pathname: '/signin', params: { next: '/checkout' } });
  };

  const updateError =
    update.error instanceof ApiError ? update.error.message : update.error ? t('error.body') : null;

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={cart.isRefetching}
          onRefresh={() => void cart.refetch()}
          tintColor={colors.link}
        />
      }
    >
      <AppText variant="title">
        {t('cart.title')}{' '}
        <AppText tone="muted">
          ·{' '}
          {itemCount === 1
            ? t('cart.itemCount', { count: itemCount })
            : t('cart.itemCountPlural', { count: itemCount })}
        </AppText>
      </AppText>

      {notices.map((notice) => (
        <FormMessage key={notice} text={notice} tone="info" />
      ))}
      {updateError ? <FormMessage text={updateError} /> : null}

      <FreeDelivery remaining={totals.freeShippingRemaining} />

      {items.map((item) => (
        <CartLine
          key={item.id}
          item={item}
          busy={update.isPending}
          onQuantity={(quantity) => update.mutate({ itemId: item.id, quantity })}
        />
      ))}

      <CouponBox applied={coupon?.code ?? null} />

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText variant="heading">{t('cart.summary')}</AppText>
        <PriceSummary totals={totals} couponCode={coupon?.code} />
        <Button label={t('cart.checkout')} onPress={checkout} disabled={update.isPending} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/shop')}
          style={styles.continue}
        >
          <AppText tone="link" style={styles.bold}>
            {t('cart.continueShopping')}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** How far from free delivery, or that it has been reached. */
function FreeDelivery({ remaining }: { remaining: number }) {
  const { t } = useLocale();
  const colors = useColors();
  return (
    <View style={[styles.free, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
      <Ionicons name="car-outline" size={20} color={colors.link} />
      <AppText variant="small" style={styles.flex}>
        {remaining > 0
          ? t('cart.freeShippingProgress', { amount: formatINR(remaining) })
          : t('cart.freeShippingReached')}
      </AppText>
    </View>
  );
}

function CouponBox({ applied }: { applied: string | null }) {
  const { t } = useLocale();
  const colors = useColors();
  const [code, setCode] = useState('');
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();

  const error =
    apply.error instanceof ApiError
      ? (apply.error.fields?.code ?? apply.error.message)
      : apply.error
        ? t('error.body')
        : null;

  if (applied) {
    return (
      <View style={[styles.applied, { backgroundColor: colors.accentSoft, borderColor: colors.action }]}>
        <Ionicons name="pricetag" size={18} color={colors.link} />
        <AppText style={[styles.flex, styles.bold]}>{t('cart.couponApplied', { code: applied })}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cart.couponRemove')}
          onPress={() => remove.mutate()}
          disabled={remove.isPending}
          hitSlop={10}
        >
          <AppText tone="danger" style={styles.bold}>
            {t('common.remove')}
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.coupon}>
      <AppText variant="small" style={styles.bold}>
        {t('cart.coupon')}
      </AppText>
      <View style={styles.couponRow}>
        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          placeholder={t('cart.couponPlaceholder')}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => code.trim() && apply.mutate(code.trim())}
          accessibilityLabel={t('cart.coupon')}
          style={[
            styles.couponInput,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : colors.borderStrong,
            },
          ]}
        />
        <Button
          label={t('common.apply')}
          variant="outline"
          onPress={() => apply.mutate(code.trim(), { onSuccess: () => setCode('') })}
          loading={apply.isPending}
          disabled={code.trim().length < 3}
        />
      </View>
      {error ? (
        <AppText variant="small" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
  free: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  coupon: { gap: spacing.xs },
  couponRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  couponInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    letterSpacing: 1,
  },
  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  continue: { alignItems: 'center', paddingVertical: spacing.sm },
  bold: { fontWeight: '700' },
});
