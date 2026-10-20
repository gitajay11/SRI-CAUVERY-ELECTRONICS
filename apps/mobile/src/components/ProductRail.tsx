import { router, type Href } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { ProductCardView } from '@tamizh/core/types';
import { ProductCard } from '@/components/ProductCard';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { spacing } from '@/theme/colors';

const CARD_WIDTH = 168;

/** A titled, sideways-scrolling row of products, with a way to see them all. */
export function ProductRail({
  title,
  subtitle,
  products,
  viewAll,
}: {
  title: string;
  subtitle?: string;
  products: ProductCardView[];
  viewAll?: Href;
}) {
  const { t } = useLocale();
  if (products.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText variant="heading">{title}</AppText>
          {subtitle ? (
            <AppText variant="small" tone="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {viewAll ? (
          <Pressable accessibilityRole="link" onPress={() => router.push(viewAll)} hitSlop={12}>
            <AppText variant="small" tone="link" style={styles.viewAll}>
              {t('common.viewAll')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(product) => product.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  titles: { flex: 1, gap: 2 },
  viewAll: { fontWeight: '700' },
  rail: { paddingHorizontal: spacing.lg, gap: spacing.md },
  cell: { width: CARD_WIDTH },
});
