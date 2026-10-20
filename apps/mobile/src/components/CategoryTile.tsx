import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CategoryView } from '@tamizh/core/types';
import { AppText } from '@/components/ui';
import { localName } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** A round category button for the home screen's category strip. */
export function CategoryTile({ category }: { category: CategoryView }) {
  const colors = useColors();
  const { locale } = useLocale();
  const name = localName(category, locale);

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() =>
        router.push({ pathname: '/products', params: { category: category.slug, title: name } })
      }
      style={styles.tile}
    >
      <View
        style={[styles.circle, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}
      >
        <Ionicons name={categoryIcon(category)} size={26} color={colors.link} />
      </View>
      <AppText variant="small" numberOfLines={2} style={styles.label}>
        {name}
      </AppText>
    </Pressable>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * The website draws its own icon set from the category's `icon` key; the app
 * picks the nearest Ionicon, by icon key first and then by slug.
 */
export function categoryIcon(category: { icon: string | null; slug: string }): IconName {
  const key = `${category.icon ?? ''} ${category.slug}`.toLowerCase();
  const table: [string, IconName][] = [
    ['charg', 'battery-charging-outline'],
    ['cable', 'git-commit-outline'],
    ['audio', 'headset-outline'],
    ['earphone', 'headset-outline'],
    ['speaker', 'volume-high-outline'],
    ['light', 'bulb-outline'],
    ['bulb', 'bulb-outline'],
    ['torch', 'flashlight-outline'],
    ['fan', 'aperture-outline'],
    ['kitchen', 'restaurant-outline'],
    ['home', 'home-outline'],
    ['gift', 'gift-outline'],
    ['wedding', 'heart-outline'],
    ['birthday', 'balloon-outline'],
    ['kid', 'happy-outline'],
    ['toy', 'happy-outline'],
    ['watch', 'watch-outline'],
    ['clock', 'time-outline'],
    ['phone', 'phone-portrait-outline'],
    ['mobile', 'phone-portrait-outline'],
    ['computer', 'laptop-outline'],
    ['power', 'flash-outline'],
    ['chip', 'hardware-chip-outline'],
    ['electronic', 'hardware-chip-outline'],
  ];
  return table.find(([needle]) => key.includes(needle))?.[1] ?? 'pricetags-outline';
}

const styles = StyleSheet.create({
  tile: { width: 84, alignItems: 'center', gap: spacing.sm },
  circle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
});
