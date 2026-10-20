import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import type { OrderView } from '@tamizh/core/types';
import { AppText, Button } from '@/components/ui';
import { localName } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * The thank-you after an order is placed. The order comes from the checkout's
 * own response (kept in the query cache); the full order page, with status
 * and cancellation, arrives with the account screens.
 */
export default function OrderPlacedScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { t, locale } = useLocale();
  const colors = useColors();
  const order = useQueryClient().getQueryData<OrderView>(['order', number]);

  const home = () => router.dismissTo('/');

  return (
    <ScrollView style={{ backgroundColor: colors.canvas }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('checkout.title'), headerBackVisible: false, gestureEnabled: false }} />

      <View style={styles.hero}>
        <View style={[styles.tick, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="checkmark-circle" size={56} color={colors.link} />
        </View>
        <AppText variant="title" style={styles.center}>
          {t('order.confirmed.title')}
        </AppText>
        {order ? (
          <AppText tone="muted" style={styles.center}>
            {t('order.confirmed.body', { email: order.customerEmail })}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label={t('order.number')} value={number} strong />
        {order ? (
          <>
            <Row label={t('order.paymentMethod')} value={t('checkout.payment.cod')} />
            <Row label={t('review.grandTotal')} value={formatINR(order.total)} strong />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <AppText variant="label" tone="faint">
              {t('order.deliverTo').toUpperCase()}
            </AppText>
            <AppText style={styles.bold}>
              {order.customerName} · {order.customerPhone}
            </AppText>
            <AppText tone="muted">
              {order.addressLine1}
              {order.addressLine2 ? `, ${order.addressLine2}` : ''}, {order.city}, {order.district},{' '}
              {order.state} {order.pincode}
            </AppText>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <AppText variant="label" tone="faint">
              {t('order.items').toUpperCase()}
            </AppText>
            {order.items.map((item) => (
              <View key={item.id} style={styles.row}>
                <AppText style={styles.flex} numberOfLines={2}>
                  {localName(item, locale)} × {item.quantity}
                </AppText>
                <AppText>{formatINR(item.unitPrice * item.quantity)}</AppText>
              </View>
            ))}
          </>
        ) : null}
      </View>

      <Button label={t('order.continueShopping')} onPress={home} />
    </ScrollView>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted">{label}</AppText>
      <AppText style={strong ? styles.bold : undefined}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  tick: { padding: spacing.md, borderRadius: radius.pill },
  card: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: radius.card },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
});
