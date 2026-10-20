import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import type { ProductCardView } from '@tamizh/core/types';
import { AppText } from '@/components/ui';
import { localName, useSuggestions } from '@/lib/catalog';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** Waits for typing to pause, so every keystroke is not a request. */
function useDebounced(value: string, ms: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** Search: suggestions as you type, the full listing on Enter. */
export default function SearchScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const [term, setTerm] = useState('');
  const query = term.trim();
  const suggestions = useSuggestions(useDebounced(term, 250));

  const submit = () => {
    if (query.length === 0) return;
    router.push({ pathname: '/products', params: { q: query } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ title: t('nav.search') }} />

      <View
        style={[styles.box, { backgroundColor: colors.raised, borderColor: colors.borderStrong }]}
      >
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={submit}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={t('search.placeholderShort')}
          style={[styles.input, { color: colors.text }]}
        />
        {term ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            onPress={() => setTerm('')}
            hitSlop={12}
          >
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={query.length >= 2 ? (suggestions.data ?? []) : []}
        keyExtractor={(product) => product.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <Suggestion product={item} />}
        ListHeaderComponent={
          query.length >= 2 && suggestions.data?.length ? (
            <AppText variant="label" tone="faint" style={styles.heading}>
              {t('search.suggestions').toUpperCase()}
            </AppText>
          ) : null
        }
        ListEmptyComponent={
          query.length >= 2 && suggestions.isSuccess && !suggestions.isPlaceholderData ? (
            <View style={styles.empty}>
              <AppText variant="heading">{t('search.noResults', { query })}</AppText>
              <AppText tone="muted">{t('search.noResultsHint')}</AppText>
            </View>
          ) : null
        }
        ListFooterComponent={
          query.length >= 2 && suggestions.data?.length ? (
            <Pressable accessibilityRole="button" onPress={submit} style={styles.all}>
              <AppText tone="link" style={styles.allText}>
                {t('search.viewAllResults', { query })}
              </AppText>
              <Ionicons name="arrow-forward" size={16} color={colors.link} />
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

function Suggestion({ product }: { product: ProductCardView }) {
  const colors = useColors();
  const { locale } = useLocale();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: product.slug } })}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.raised }]}>
        {product.image ? (
          <Image
            source={{ uri: assetUrl(product.image.url) }}
            style={styles.thumbImage}
            contentFit="contain"
          />
        ) : null}
      </View>
      <AppText numberOfLines={2} style={styles.rowName}>
        {localName(product, locale)}
      </AppText>
      <AppText style={styles.price}>{formatINR(product.price)}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  thumbImage: { flex: 1 },
  rowName: { flex: 1 },
  price: { fontWeight: '700' },
  empty: { gap: spacing.sm, paddingTop: spacing.lg },
  all: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  allText: { fontWeight: '700' },
});
