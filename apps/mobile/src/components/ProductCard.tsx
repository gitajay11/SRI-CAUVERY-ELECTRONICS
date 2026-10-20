import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import type { ProductCardView } from '@tamizh/core/types';
import { StarRating } from '@/components/StarRating';
import { WishlistButton } from '@/components/WishlistButton';
import { AppText } from '@/components/ui';
import { localName } from '@/lib/catalog';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** A product in a grid or a row: image, name, rating, price, saving. Opens the product. */
export function ProductCard({ product }: { product: ProductCardView }) {
  const colors = useColors();
  const { locale, t } = useLocale();
  const name = localName(product, locale);
  const soldOut = product.stock <= 0;

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: product.slug } })}
      accessibilityLabel={`${name}, ${formatINR(product.price)}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.raised }]}>
        {product.image ? (
          <Image
            source={{ uri: assetUrl(product.image.url) }}
            alt={product.image.alt}
            style={styles.image}
            contentFit="contain"
            transition={150}
            recyclingKey={product.id}
          />
        ) : null}
        {product.discountPercent > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.action }]}>
            <AppText variant="label" style={{ color: colors.onAction }}>
              {t('product.off', { percent: product.discountPercent })}
            </AppText>
          </View>
        ) : null}
        <View style={styles.heart}>
          <WishlistButton product={product} size={18} floating />
        </View>
      </View>

      <View style={styles.body}>
        <AppText variant="small" numberOfLines={2} style={styles.name}>
          {name}
        </AppText>
        {product.ratingCount > 0 ? (
          <StarRating value={product.ratingAvg} count={product.ratingCount} />
        ) : null}
        <View style={styles.prices}>
          <AppText variant="heading">{formatINR(product.price)}</AppText>
          {product.mrp > product.price ? (
            <AppText variant="small" tone="faint" style={styles.mrp}>
              {formatINR(product.mrp)}
            </AppText>
          ) : null}
        </View>
        {soldOut ? (
          <AppText variant="small" tone="danger">
            {t('product.outOfStock')}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  imageWrap: { aspectRatio: 1 },
  image: { flex: 1 },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  heart: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  body: { padding: spacing.md, gap: spacing.xs },
  name: { minHeight: 36 },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  mrp: { textDecorationLine: 'line-through' },
});
