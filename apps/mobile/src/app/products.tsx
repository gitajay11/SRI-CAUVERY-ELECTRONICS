import { Stack, useLocalSearchParams } from 'expo-router';
import { SORT_KEYS, type SortKey } from '@tamizh/core/types';
import { ProductListing } from '@/components/ProductListing';
import { useLocale } from '@/lib/i18n';

/**
 * A product listing, described by its parameters: `category`, `q`,
 * `featured=1` and `sort` set what is listed, `title` what the header says.
 */
export default function ProductsScreen() {
  const { t } = useLocale();
  const params = useLocalSearchParams<{
    title?: string;
    category?: string;
    q?: string;
    featured?: string;
    sort?: string;
  }>();

  const sort = SORT_KEYS.includes(params.sort as SortKey) ? (params.sort as SortKey) : undefined;
  const title =
    params.title ?? (params.q ? t('search.resultsFor', { query: params.q }) : t('shop.title'));

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ProductListing
        // A new set of parameters is a new listing, with its own sort and filters.
        key={`${params.category}|${params.q}|${params.featured}|${params.sort}`}
        base={{
          category: params.category || undefined,
          q: params.q || undefined,
          featured: params.featured === '1' || undefined,
          sort,
        }}
      />
    </>
  );
}
