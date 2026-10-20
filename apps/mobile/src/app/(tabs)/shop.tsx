import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useScrollToTop, type Href } from 'expo-router';
import { useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { CategoryView } from '@tamizh/core/types';
import { categoryIcon } from '@/components/CategoryTile';
import { SearchLink } from '@/components/SearchLink';
import { AppText, ErrorState, StateMessage } from '@/components/ui';
import { localName, useCategories } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { useHideTabBarOnScroll, useTabBarInset } from '@/lib/tab-bar';
import { radius, spacing, useColors } from '@/theme/colors';

/** Shop: everything, then each top-level category and its sub-categories. */
export default function ShopScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const categories = useCategories();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const onScroll = useHideTabBarOnScroll();
  const bottomInset = useTabBarInset();

  if (categories.isPending) return <StateMessage loading />;
  if (categories.isError) {
    return <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      refreshControl={
        <RefreshControl
          refreshing={categories.isRefetching}
          onRefresh={() => void categories.refetch()}
          tintColor={colors.link}
        />
      }
    >
      <SearchLink />

      <Row
        icon="apps-outline"
        title={t('shop.title')}
        subtitle={t('shop.subtitle')}
        href={{ pathname: '/products', params: { title: t('shop.title') } }}
      />

      {categories.data.map((category) => (
        <CategoryGroup key={category.id} category={category} />
      ))}
    </ScrollView>
  );
}

function CategoryGroup({ category }: { category: CategoryView }) {
  const { locale } = useLocale();
  const colors = useColors();
  const name = localName(category, locale);
  const children = category.children ?? [];

  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Row
        icon={categoryIcon(category)}
        title={name}
        count={category.productCount}
        href={{ pathname: '/products', params: { category: category.slug, title: name } }}
        strong
      />
      {children.map((child) => {
        const childName = localName(child, locale);
        return (
          <Row
            key={child.id}
            icon={categoryIcon(child)}
            title={childName}
            count={child.productCount}
            href={{ pathname: '/products', params: { category: child.slug, title: childName } }}
          />
        );
      })}
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  count,
  href,
  strong = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  count?: number;
  href: Href;
  strong?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={colors.link} />
      <View style={styles.rowText}>
        <AppText variant={strong ? 'heading' : 'body'}>{title}</AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {count !== undefined ? (
        <AppText variant="small" tone="faint">
          {count}
        </AppText>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  group: { borderWidth: 1, borderRadius: radius.card, paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
});
