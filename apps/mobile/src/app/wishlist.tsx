import { Redirect, router, Stack } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { firstQuantity, quantityRuleFor } from '@tamizh/core/quantity';
import type { ProductCardView } from '@tamizh/core/types';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { AppText, Button, ErrorState, StateMessage } from '@/components/ui';
import { useToggleWishlist, useWishlist } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { useAddToCart } from '@/lib/cart';
import { useLocale } from '@/lib/i18n';
import { spacing, useColors } from '@/theme/colors';

/** Saved products; the heart on each removes it, "Move to cart" moves it. */
export default function WishlistScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const wishlist = useWishlist();

  if (!user) return <Redirect href={{ pathname: '/signin', params: { next: '/wishlist' } }} />;

  return (
    <>
      <Stack.Screen options={{ title: t('wishlist.title') }} />
      {wishlist.isPending ? (
        <ProductGridSkeleton count={4} />
      ) : wishlist.isError ? (
        <ErrorState error={wishlist.error} onRetry={() => void wishlist.refetch()} />
      ) : (
        <FlatList
          style={{ backgroundColor: colors.canvas }}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          numColumns={2}
          data={wishlist.data}
          keyExtractor={(product) => product.id}
          renderItem={({ item }) => <Saved product={item} />}
          ListHeaderComponent={
            wishlist.data.length > 0 ? (
              <AppText tone="muted">{t('wishlist.count', { count: wishlist.data.length })}</AppText>
            ) : null
          }
          ListEmptyComponent={
            <StateMessage
              title={t('wishlist.empty.title')}
              body={t('wishlist.empty.body')}
              action={{ label: t('cart.empty.cta'), onPress: () => router.navigate('/shop') }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={wishlist.isRefetching}
              onRefresh={() => void wishlist.refetch()}
              tintColor={colors.link}
            />
          }
        />
      )}
    </>
  );
}

function Saved({ product }: { product: ProductCardView }) {
  const { t } = useLocale();
  const add = useAddToCart();
  const toggle = useToggleWishlist();
  const soldOut = product.stock <= 0;

  return (
    <View style={styles.cell}>
      <ProductCard product={product} />
      <Button
        label={soldOut ? t('product.outOfStock') : t('wishlist.moveToCart')}
        variant="outline"
        disabled={soldOut}
        loading={add.isPending || toggle.isPending}
        onPress={() =>
          add.mutate(
            { productId: product.id, quantity: firstQuantity(quantityRuleFor(product)) },
            { onSuccess: () => toggle.mutate(product) },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.md },
  cell: { flex: 1, maxWidth: '50%', gap: spacing.sm },
});
