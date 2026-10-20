import { Image } from 'expo-image';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import { CANCELLABLE_STATUSES } from '@tamizh/core/pricing';
import type { OrderStatus, OrderView } from '@tamizh/core/types';
import { formatDate } from '@tamizh/core/utils';
import { CancellationCard, CancelRequest, ReturnRequest } from '@/components/OrderRequests';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { AppText, ErrorState, StateMessage } from '@/components/ui';
import { useOrder } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { localName } from '@/lib/catalog';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** The steps a normal order walks through, as the website's tracker shows them. */
const TRACK: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** One order: where it is, what is in it, where it goes, and cancelling or returning it. */
export default function OrderScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const query = useOrder(number);

  if (!user) {
    return <Redirect href={{ pathname: '/signin', params: { next: `/order/${number}` } }} />;
  }
  if (query.isPending) return <StateMessage loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { order, returns } = query.data;
  const request = order.cancellationRequest;
  const canAskToCancel =
    CANCELLABLE_STATUSES.includes(order.status) && (!request || request.status === 'REJECTED');

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.link}
        />
      }
    >
      <Stack.Screen options={{ title: order.orderNumber }} />

      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="small" tone="muted">
              {t('order.number')}
            </AppText>
            <AppText variant="heading">{order.orderNumber}</AppText>
            <AppText variant="small" tone="muted">
              {t('order.date')}: {formatDate(order.placedAt, true)}
            </AppText>
          </View>
          <OrderStatusBadge status={order.status} />
        </View>
        <Tracker status={order.status} />
        {order.trackingNumber ? (
          <AppText variant="small">
            {t('order.trackingNumber')}:{' '}
            <AppText style={styles.bold}>{order.trackingNumber}</AppText>
          </AppText>
        ) : null}
        {order.status === 'CANCELLED' && order.cancelReason ? (
          <AppText variant="small" tone="danger">
            {t('order.cancelled')} “{order.cancelReason}”
          </AppText>
        ) : null}
      </Card>

      {request ? (
        <CancellationCard request={request} paid={order.paymentStatus === 'PAID'} />
      ) : null}

      <Card>
        <AppText variant="heading">{t('order.items')}</AppText>
        {order.items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole={item.slug ? 'link' : undefined}
            disabled={!item.slug}
            onPress={() =>
              item.slug && router.push({ pathname: '/product/[slug]', params: { slug: item.slug } })
            }
            style={styles.item}
          >
            <View style={[styles.thumb, { backgroundColor: colors.raised }]}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: assetUrl(item.imageUrl) }}
                  style={styles.flex}
                  contentFit="contain"
                />
              ) : null}
            </View>
            <View style={styles.flex}>
              <ItemName item={item} />
              <AppText variant="small" tone="muted">
                {t('review.qtyPrice', { qty: item.quantity, price: formatINR(item.unitPrice) })}
              </AppText>
            </View>
            <AppText style={styles.bold}>{formatINR(item.unitPrice * item.quantity)}</AppText>
          </Pressable>
        ))}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Totals order={order} />
      </Card>

      <Card>
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
          {t('order.paymentMethod').toUpperCase()}
        </AppText>
        <AppText>
          {order.paymentMethod === 'COD' ? t('checkout.payment.cod') : order.paymentMethod}
        </AppText>
        {order.notes ? (
          <AppText variant="small" tone="muted">
            “{order.notes}”
          </AppText>
        ) : null}
      </Card>

      {canAskToCancel ? <CancelRequest orderNumber={order.orderNumber} /> : null}
      {returns ? <ReturnRequest orderNumber={order.orderNumber} returns={returns} /> : null}
    </ScrollView>
  );
}

function ItemName({ item }: { item: { name: string; nameTa: string | null } }) {
  const { locale } = useLocale();
  return <AppText numberOfLines={2}>{localName(item, locale)}</AppText>;
}

/** Where the order is in its journey; cancelled and returned orders say so instead. */
function Tracker({ status }: { status: OrderStatus }) {
  const { t } = useLocale();
  const colors = useColors();
  const at = TRACK.indexOf(status === 'READY_TO_SHIP' ? 'PROCESSING' : status);
  if (at === -1) return null;

  return (
    <View style={styles.tracker} accessibilityLabel={t(`order.status.${status}`)}>
      {TRACK.map((step, index) => (
        <View key={step} style={styles.trackStep}>
          <View style={styles.trackLineRow}>
            <View
              style={[
                styles.trackDot,
                { backgroundColor: index <= at ? colors.link : colors.borderStrong },
              ]}
            />
            {index < TRACK.length - 1 ? (
              <View
                style={[
                  styles.trackLine,
                  { backgroundColor: index < at ? colors.link : colors.borderStrong },
                ]}
              />
            ) : null}
          </View>
          <AppText
            variant="label"
            tone={index <= at ? 'default' : 'faint'}
            numberOfLines={2}
            style={styles.trackLabel}
          >
            {t(`order.status.${step}`)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Totals({ order }: { order: OrderView }) {
  const { t } = useLocale();
  return (
    <View style={styles.totals}>
      <Line label={t('cart.subtotal')} value={formatINR(order.subtotal)} />
      {order.discountTotal > 0 ? (
        <Line
          label={t('cart.couponDiscount', { code: order.couponCode ?? '' })}
          value={`− ${formatINR(order.discountTotal)}`}
        />
      ) : null}
      <Line
        label={t('cart.shipping')}
        value={order.shippingFee === 0 ? t('cart.shippingFree') : formatINR(order.shippingFee)}
      />
      <View style={styles.row}>
        <AppText variant="heading">{t('review.grandTotal')}</AppText>
        <AppText variant="heading">{formatINR(order.total)}</AppText>
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: radius.card },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  totals: { gap: spacing.xs },
  tracker: { flexDirection: 'row', marginTop: spacing.md },
  trackStep: { flex: 1, gap: spacing.xs },
  trackLineRow: { flexDirection: 'row', alignItems: 'center' },
  trackDot: { width: 12, height: 12, borderRadius: 6 },
  trackLine: { flex: 1, height: 2 },
  trackLabel: { fontSize: 10, lineHeight: 12, paddingRight: 2 },
  bold: { fontWeight: '700' },
});
