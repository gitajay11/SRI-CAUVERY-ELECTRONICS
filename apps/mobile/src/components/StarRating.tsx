import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { useColors } from '@/theme/colors';

/** Five stars filled to the nearest half, with the review count beside them. */
export function StarRating({
  value,
  count,
  size = 13,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  const colors = useColors();
  const { t } = useLocale();
  const rounded = Math.round(value * 2) / 2;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('product.ratingOf', { rating: value.toFixed(1) })}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          size={size}
          color={colors.action}
          name={rounded >= star ? 'star' : rounded >= star - 0.5 ? 'star-half' : 'star-outline'}
        />
      ))}
      {count !== undefined ? (
        <AppText variant="small" tone="faint" style={styles.count}>
          ({count})
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  count: { marginLeft: 4 },
});
