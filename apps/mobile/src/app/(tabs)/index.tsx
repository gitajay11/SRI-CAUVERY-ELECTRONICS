import Ionicons from '@expo/vector-icons/Ionicons';
import { useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { CategoryTile } from '@/components/CategoryTile';
import { ProductRail } from '@/components/ProductRail';
import { SearchLink } from '@/components/SearchLink';
import { HomeSkeleton } from '@/components/Skeleton';
import { AppText, ErrorState } from '@/components/ui';
import { useHome } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { useHideTabBarOnScroll, useTabBarInset } from '@/lib/tab-bar';
import { radius, spacing, useColors } from '@/theme/colors';

/** Home: search, the categories, and the website's home-page product rows. */
export default function HomeScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const home = useHome();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const onScroll = useHideTabBarOnScroll();
  const bottomInset = useTabBarInset();

  if (home.isPending) return <HomeSkeleton />;
  if (home.isError) return <ErrorState error={home.error} onRetry={() => void home.refetch()} />;

  const { categories, featured, bestSellers, newArrivals, returnGifts, bestOffers } = home.data;
  // The leaf categories are where the products are; the three top-level ones
  // stand only for themselves when they have no children.
  const strip = categories.flatMap((category) =>
    category.children?.length ? category.children : [category],
  );

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      refreshControl={
        <RefreshControl
          refreshing={home.isRefetching}
          onRefresh={() => void home.refetch()}
          tintColor={colors.link}
        />
      }
    >
      <View style={styles.padded}>
        <SearchLink />
      </View>

      <View style={[styles.promise, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
        <Badge icon="car-outline" text={t('home.hero.badgeDelivery')} />
        <Badge icon="cash-outline" text={t('home.hero.badgeCod')} />
        <Badge icon="refresh-outline" text={t('home.hero.badgeReturns')} />
      </View>

      <View style={styles.section}>
        <View style={styles.padded}>
          <AppText variant="heading">{t('home.categories.title')}</AppText>
        </View>
        <FlatList
          horizontal
          data={strip}
          keyExtractor={(category) => category.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          renderItem={({ item }) => <CategoryTile category={item} />}
        />
      </View>

      <ProductRail
        title={t('home.featured.title')}
        subtitle={t('home.featured.subtitle')}
        products={featured}
        viewAll={{ pathname: '/products', params: { featured: '1', title: t('home.featured.title') } }}
      />
      <ProductRail
        title={t('home.bestSellers.title')}
        subtitle={t('home.bestSellers.subtitle')}
        products={bestSellers}
        viewAll={{
          pathname: '/products',
          params: { sort: 'best-selling', title: t('home.bestSellers.title') },
        }}
      />
      <ProductRail
        title={t('home.returnGifts.title')}
        subtitle={t('home.returnGifts.subtitle')}
        products={returnGifts}
        viewAll={{
          pathname: '/products',
          params: { category: 'return-gifts', title: t('nav.returnGifts') },
        }}
      />
      <ProductRail
        title={t('home.newArrivals.title')}
        subtitle={t('home.newArrivals.subtitle')}
        products={newArrivals}
        viewAll={{ pathname: '/products', params: { sort: 'newest', title: t('home.newArrivals.title') } }}
      />
      <ProductRail
        title={t('home.offers.title')}
        subtitle={t('home.offers.subtitle')}
        products={bestOffers}
      />
    </ScrollView>
  );
}

/** One of the shop's three promises: delivery, cash on delivery, returns. */
function Badge({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.promiseItem}>
      <Ionicons name={icon} size={20} color={colors.link} />
      <AppText variant="small" style={styles.promiseText} numberOfLines={2}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.lg, gap: spacing.xl },
  padded: { paddingHorizontal: spacing.lg },
  section: { gap: spacing.md },
  rail: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  promise: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
  },
  promiseItem: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  promiseText: { textAlign: 'center' },
});
