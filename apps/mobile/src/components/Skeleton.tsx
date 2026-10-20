import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * Placeholders in the shape of what is loading, so the screen does not jump
 * when it arrives. One shared pulse, opacity only; still under reduced motion.
 */

function usePulse() {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    opacity.set(withRepeat(withTiming(0.45, { duration: 750 }), -1, true));
  }, [reducedMotion, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}

function Bone({
  width = '100%',
  height,
  round = radius.sm,
}: {
  width?: DimensionValue;
  height: DimensionValue;
  round?: number;
}) {
  const colors = useColors();
  return <View style={{ width, height, borderRadius: round, backgroundColor: colors.border }} />;
}

/** Wraps a skeleton: one pulse, announced once as loading. */
function Pulse({ children, style }: { children: React.ReactNode; style?: object }) {
  const { t } = useLocale();
  const pulse = usePulse();
  return (
    <Animated.View
      accessible
      accessibilityLabel={t('common.loading')}
      accessibilityRole="progressbar"
      style={[style, pulse]}
    >
      {children}
    </Animated.View>
  );
}

function CardBones() {
  const colors = useColors();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.cardImage, { backgroundColor: colors.border }]} />
      <View style={styles.cardBody}>
        <Bone height={12} />
        <Bone height={12} width="70%" />
        <Bone height={18} width="45%" />
      </View>
    </View>
  );
}

/** A two-column product grid: listings, search results, the wishlist. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  const colors = useColors();
  return (
    <ScrollView style={{ backgroundColor: colors.canvas }} scrollEnabled={false}>
      <Pulse style={styles.grid}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={styles.gridCell}>
            <CardBones />
          </View>
        ))}
      </Pulse>
    </ScrollView>
  );
}

/** Home: search box, category circles, then a row of cards. */
export function HomeSkeleton() {
  const colors = useColors();
  return (
    <ScrollView style={{ backgroundColor: colors.canvas }} scrollEnabled={false}>
      <Pulse style={styles.home}>
        <Bone height={46} round={radius.pill} />
        <Bone height={64} round={radius.card} />
        <Bone height={18} width="45%" />
        <View style={styles.row}>
          {Array.from({ length: 5 }, (_, index) => (
            <View key={index} style={styles.circleCell}>
              <Bone width={64} height={64} round={radius.pill} />
              <Bone width={56} height={10} />
            </View>
          ))}
        </View>
        <Bone height={18} width="55%" />
        <View style={styles.row}>
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} style={styles.railCell}>
              <CardBones />
            </View>
          ))}
        </View>
      </Pulse>
    </ScrollView>
  );
}

/** The product page: the square image, then title, price and buttons. */
export function ProductSkeleton() {
  const colors = useColors();
  return (
    <ScrollView style={{ backgroundColor: colors.canvas }} scrollEnabled={false}>
      <Pulse>
        <View style={[styles.squareImage, { backgroundColor: colors.border }]} />
        <View style={styles.productBody}>
          <Bone height={12} width="30%" />
          <Bone height={24} />
          <Bone height={24} width="60%" />
          <Bone height={14} width="40%" />
          <Bone height={120} round={radius.card} />
          <Bone height={48} round={radius.pill} />
        </View>
      </Pulse>
    </ScrollView>
  );
}

/** A list of cards: orders, category rows. */
export function ListSkeleton({ count = 5, height = 96 }: { count?: number; height?: number }) {
  const colors = useColors();
  return (
    <ScrollView style={{ backgroundColor: colors.canvas }} scrollEnabled={false}>
      <Pulse style={styles.list}>
        {Array.from({ length: count }, (_, index) => (
          <Bone key={index} height={height} round={radius.card} />
        ))}
      </Pulse>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.lg, gap: spacing.md },
  gridCell: { width: '47.5%' },
  card: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  cardImage: { aspectRatio: 1 },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  home: { padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  circleCell: { alignItems: 'center', gap: spacing.sm },
  railCell: { width: 168 },
  squareImage: { aspectRatio: 1, width: '100%' },
  productBody: { padding: spacing.lg, gap: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md },
});
