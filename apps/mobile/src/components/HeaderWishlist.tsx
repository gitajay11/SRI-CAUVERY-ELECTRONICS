import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useWishlist } from '@/lib/account';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** The heart in the Home header: the quick way to the wishlist, with its count. */
export function HeaderWishlist() {
  const { t } = useLocale();
  const colors = useColors();
  const count = useWishlist().data?.length ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${t('nav.wishlist')}, ${count}` : t('nav.wishlist')}
      onPress={() => router.push('/wishlist')}
      hitSlop={10}
      style={styles.button}
    >
      <Ionicons
        name={count > 0 ? 'heart' : 'heart-outline'}
        size={24}
        color={count > 0 ? colors.danger : colors.text}
      />
      {count > 0 ? (
        <View
          style={[styles.badge, { backgroundColor: colors.action, borderColor: colors.surface }]}
        >
          <AppText style={[styles.badgeText, { color: colors.onAction }]}>
            {count > 99 ? '99+' : count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.lg },
  badge: {
    position: 'absolute',
    top: -6,
    right: spacing.lg - 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
});
