import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import type { ProductCardView } from '@tamizh/core/types';
import { useIsWishlisted, useToggleWishlist } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { radius, useColors } from '@/theme/colors';

/**
 * The heart. Saves or unsaves at once for a signed-in shopper; a guest is
 * taken to sign in, since a wishlist belongs to an account.
 */
export function WishlistButton({
  product,
  size = 20,
  floating = false,
}: {
  product: ProductCardView;
  size?: number;
  /** Over a product image: a round backing so the heart reads on any picture. */
  floating?: boolean;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const { user } = useAuth();
  const saved = useIsWishlisted(product.id);
  const toggle = useToggleWishlist();

  const onPress = () => {
    if (!user) {
      router.push('/signin');
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    toggle.mutate(product);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? t('product.removeFromWishlist') : t('product.addToWishlist')}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.button,
        floating && [
          styles.floating,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ],
      ]}
    >
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={size}
        color={saved ? colors.danger : floating ? colors.textMuted : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  floating: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
