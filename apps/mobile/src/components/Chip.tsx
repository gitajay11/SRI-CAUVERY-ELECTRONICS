import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { radius, spacing, useColors } from '@/theme/colors';

/** A toggle shaped like a pill: brands, ratings, discounts, sort orders. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.action : colors.borderStrong,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
        },
      ]}
    >
      <AppText variant="small" style={{ fontWeight: selected ? '700' : '400' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
