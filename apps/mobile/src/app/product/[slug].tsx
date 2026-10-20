import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { formatINR, savings } from '@tamizh/core/money';
import type { ProductDetailView, ReviewView } from '@tamizh/core/types';
import { formatDate } from '@tamizh/core/utils';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductRail } from '@/components/ProductRail';
import { PurchasePanel } from '@/components/PurchasePanel';
import { WishlistButton } from '@/components/WishlistButton';
import { StarRating } from '@/components/StarRating';
import { AppText, ErrorState, StateMessage } from '@/components/ui';
import { localName, useProduct } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** One product: images, price, buying, delivery, details and reviews. */
export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, locale } = useLocale();
  const colors = useColors();
  const query = useProduct(slug);

  if (query.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <StateMessage loading />
      </>
    );
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const { product, related } = query.data;
  const name = localName(product, locale);
  const otherName = locale === 'ta' ? product.name : product.nameTa;
  const saved = savings(product.mrp, product.price);
  const description =
    locale === 'ta' && product.descriptionTa ? product.descriptionTa : product.description;

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
      <Stack.Screen options={{ title: localName(product.category, locale) }} />

      <ProductGallery
        images={product.images}
        badge={
          product.discountPercent > 0 ? (
            <View style={[styles.offBadge, { backgroundColor: colors.action }]}>
              <AppText variant="small" style={[styles.bold, { color: colors.onAction }]}>
                {t('product.off', { percent: product.discountPercent })}
              </AppText>
            </View>
          ) : null
        }
      />

      <View style={styles.padded}>
        <View style={styles.brandRow}>
          <AppText variant="label" tone="link" style={styles.flex}>
            {product.brand.toUpperCase()}
          </AppText>
          <WishlistButton product={product} size={24} />
        </View>
        <AppText variant="title">{name}</AppText>
        {otherName && otherName !== name ? (
          <AppText variant="small" tone="muted">
            {otherName}
          </AppText>
        ) : null}
        <View style={styles.metaRow}>
          {product.ratingCount > 0 ? (
            <StarRating value={product.ratingAvg} count={product.ratingCount} size={15} />
          ) : null}
          {product.soldCount > 100 ? (
            <AppText variant="small" tone="muted">
              {t('product.sold', { count: product.soldCount.toLocaleString('en-IN') })}
            </AppText>
          ) : null}
        </View>
      </View>

      <Card>
        <View style={styles.priceRow}>
          <AppText style={styles.price}>{formatINR(product.price)}</AppText>
          {product.mrp > product.price ? (
            <AppText tone="faint" style={styles.mrp}>
              {formatINR(product.mrp)}
            </AppText>
          ) : null}
        </View>
        {saved > 0 ? (
          <AppText tone="link" style={styles.bold}>
            {t('product.save', { amount: formatINR(saved) })}
          </AppText>
        ) : null}
        <AppText variant="small" tone="faint">
          {t('product.inclusiveTax')}
        </AppText>
        <View style={styles.divider} />
        <PurchasePanel product={product} />
      </Card>

      <Card>
        <AppText variant="heading">{t('product.deliveryTitle')}</AppText>
        <DeliveryLine icon="car-outline" text={t('product.deliveryFree')} />
        <DeliveryLine icon="time-outline" text={t('product.deliveryEta')} />
        <DeliveryLine icon="refresh-outline" text={t('product.deliveryReturns')} />
        <DeliveryLine icon="cash-outline" text={t('product.deliveryCod')} />
      </Card>

      {description ? (
        <Card>
          <AppText variant="heading">{t('product.description')}</AppText>
          <AppText tone="muted">{description}</AppText>
        </Card>
      ) : null}

      <Specs product={product} />

      <Card>
        <AppText variant="heading">
          {t('product.reviewsTab')}
          {product.reviews.length ? ` (${product.reviews.length})` : ''}
        </AppText>
        {product.reviews.length === 0 ? (
          <AppText tone="muted">{t('product.noReviews')}</AppText>
        ) : (
          product.reviews.map((review) => <Review key={review.id} review={review} />)
        )}
      </Card>

      <ProductRail title={t('product.related')} products={related} />
    </ScrollView>
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

/** One line of the delivery-and-returns promise. */
function DeliveryLine({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.promise}>
      <Ionicons name={icon} size={18} color={colors.link} />
      <AppText variant="small" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

function Specs({ product }: { product: ProductDetailView }) {
  const { t } = useLocale();
  const colors = useColors();
  const rows: [string, string][] = [
    [t('product.brand'), product.brand],
    [t('product.sku'), product.sku],
    ...Object.entries(product.specs),
  ];
  return (
    <Card>
      <AppText variant="heading">{t('product.specifications')}</AppText>
      {rows.map(([label, value]) => (
        <View key={label} style={[styles.specRow, { borderBottomColor: colors.border }]}>
          <AppText variant="small" tone="muted" style={styles.specLabel}>
            {label}
          </AppText>
          <AppText variant="small" style={styles.flex}>
            {value}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

function Review({ review }: { review: ReviewView }) {
  const colors = useColors();
  return (
    <View style={[styles.review, { borderTopColor: colors.border }]}>
      <View style={styles.reviewHead}>
        <StarRating value={review.rating} />
        <AppText variant="small" tone="faint">
          {review.authorName} · {formatDate(review.createdAt)}
        </AppText>
      </View>
      {review.title ? <AppText style={styles.bold}>{review.title}</AppText> : null}
      <AppText tone="muted">{review.comment}</AppText>
      {review.reply ? (
        <View style={[styles.reply, { backgroundColor: colors.raised }]}>
          <AppText variant="small" tone="link" style={styles.bold}>
            Sri Cauvery Electronics
          </AppText>
          <AppText variant="small">{review.reply}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl, gap: spacing.lg },
  padded: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' },
  price: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  mrp: { fontSize: 17, textDecorationLine: 'line-through' },
  divider: { height: spacing.sm },
  offBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  promise: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  specRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  specLabel: { width: '40%' },
  review: { gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reply: { gap: 2, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.xs },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
});
