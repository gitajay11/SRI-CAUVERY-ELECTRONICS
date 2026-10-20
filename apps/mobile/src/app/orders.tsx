import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Redirect, router, Stack } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import type { OrderView } from '@tamizh/core/types';
import { formatDate } from '@tamizh/core/utils';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { AppText, ErrorState, StateMessage } from '@/components/ui';
import { useOrders } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** My orders, newest first. */
export default function OrdersScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const orders = useOrders();

  if (!user) return <Redirect href={{ pathname: '/signin', params: { next: '/orders' } }} />;

  return (
    <>
      <Stack.Screen options={{ title: t('order.myOrders') }} />
      {orders.isPending ? (
        <StateMessage loading />
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : (
        <FlatList
          style={{ backgroundColor: colors.canvas }}
          contentContainerStyle={styles.list}
          data={orders.data}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          ListEmptyComponent={
            <StateMessage
              title={t('order.empty.title')}
              body={t('order.empty.body')}
              action={{ label: t('cart.empty.cta'), onPress: () => router.navigate('/shop') }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={orders.isRefetching}
              onRefresh={() => void orders.refetch()}
              tintColor={colors.link}
            />
          }
        />
      )}
    </>
  );
}

function OrderCard({ order }: { order: OrderView }) {
  const { t } = useLocale();
  const colors = useColors();
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${t('order.number')} ${order.orderNumber}, ${t(`order.status.${order.status}`)}, ${formatINR(order.total)}`}
      onPress={() =>
        router.push({ pathname: '/order/[number]', params: { number: order.orderNumber } })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText style={styles.bold}>{order.orderNumber}</AppText>
          <AppText variant="small" tone="muted">
            {formatDate(order.placedAt)} · {t('order.success.itemCount', { count })}
          </AppText>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View style={styles.thumbs}>
        {order.items.slice(0, 4).map((item) => (
          <View key={item.id} style={[styles.thumb, { backgroundColor: colors.raised }]}>
            {item.imageUrl ? (
              <Image
                source={{ uri: assetUrl(item.imageUrl) }}
                style={styles.flex}
                contentFit="contain"
              />
            ) : null}
          </View>
        ))}
        {order.items.length > 4 ? (
          <AppText variant="small" tone="muted">
            +{order.items.length - 4}
          </AppText>
        ) : null}
        <View style={styles.flex} />
        <AppText variant="heading">{formatINR(order.total)}</AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </View>

      {order.cancellationRequest?.status === 'PENDING' ? (
        <AppText variant="small" tone="danger" style={styles.bold}>
          {t('order.cancelPending')}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  thumbs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden' },
  bold: { fontWeight: '700' },
});
