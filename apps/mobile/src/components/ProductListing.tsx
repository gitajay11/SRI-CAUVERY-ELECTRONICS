import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import type { SortKey } from '@tamizh/core/types';
import { FilterSheet, SortSheet } from '@/components/ListingSheets';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { AppText, ErrorState, StateMessage } from '@/components/ui';
import { activeFilterCount, type ProductFilters, useProductSearch } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * The product grid behind every "View all", category and search: the
 * screen's own filter (category, search term, featured) stays fixed, and the
 * shopper adds a sort order and the optional filters on top.
 */
export function ProductListing({ base }: { base: ProductFilters }) {
  const { t } = useLocale();
  const colors = useColors();
  const [sort, setSort] = useState<SortKey | undefined>(base.sort);
  const [extra, setExtra] = useState<ProductFilters>({});
  const [sheet, setSheet] = useState<'sort' | 'filters' | null>(null);

  const filters: ProductFilters = { ...base, ...extra, sort };
  const search = useProductSearch(filters);
  const products = search.data?.pages.flatMap((page) => page.items) ?? [];
  const first = search.data?.pages[0];
  const filterCount = activeFilterCount(extra);

  if (search.isPending) return <ProductGridSkeleton />;
  if (search.isError && !search.data) {
    return <ErrorState error={search.error} onRetry={() => void search.refetch()} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <View
        style={[
          styles.toolbar,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <AppText variant="small" tone="muted" style={styles.count}>
          {t('search.countResults', { count: first?.total ?? 0 })}
        </AppText>
        <ToolbarButton
          icon="swap-vertical"
          label={t('shop.sort')}
          onPress={() => setSheet('sort')}
        />
        <ToolbarButton
          icon="options-outline"
          label={filterCount ? `${t('shop.filters')} · ${filterCount}` : t('shop.filters')}
          onPress={() => setSheet('filters')}
          active={filterCount > 0}
        />
      </View>

      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(product) => product.id}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} />
          </View>
        )}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
        }}
        ListEmptyComponent={
          <StateMessage title={t('shop.empty.title')} body={t('shop.empty.body')} />
        }
        ListFooterComponent={
          search.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.link} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={search.isRefetching && !search.isFetchingNextPage}
            onRefresh={() => void search.refetch()}
            tintColor={colors.link}
          />
        }
      />

      <SortSheet
        visible={sheet === 'sort'}
        value={sort ?? 'relevance'}
        onChange={setSort}
        onClose={() => setSheet(null)}
      />
      <FilterSheet
        visible={sheet === 'filters'}
        value={extra}
        facets={first?.facets}
        onApply={setExtra}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function ToolbarButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.toolButton,
        {
          borderColor: active ? colors.action : colors.borderStrong,
          backgroundColor: active ? colors.accentSoft : colors.surface,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
      <AppText variant="small" style={styles.toolLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  count: { flex: 1 },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  toolLabel: { fontWeight: '600' },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.md },
  cell: { flex: 1, maxWidth: '50%' },
  footer: { marginVertical: spacing.lg },
});
