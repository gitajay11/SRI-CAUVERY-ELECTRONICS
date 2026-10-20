import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** Looks like a search box; opens the search screen, where the keyboard is. */
export function SearchLink() {
  const colors = useColors();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="search"
      onPress={() => router.push('/search')}
      accessibilityLabel={t('search.placeholderShort')}
      style={[styles.box, { backgroundColor: colors.raised, borderColor: colors.borderStrong }]}
    >
      <Ionicons name="search" size={18} color={colors.textFaint} />
      <AppText tone="faint" numberOfLines={1} style={styles.text}>
        {t('search.placeholder')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { flex: 1 },
});
