import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ProductImageView } from '@tamizh/core/types';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** The product's images, a swipe apiece, with dots for where you are. */
export function ProductGallery({ images, badge }: { images: ProductImageView[]; badge?: React.ReactNode }) {
  const colors = useColors();
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        data={images}
        keyExtractor={(image, i) => `${image.url}-${i}`}
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t('product.gallery')}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: i }) => (
          <View style={[{ width, height: width }, { backgroundColor: colors.raised }]}>
            <Image
              source={{ uri: assetUrl(item.url) }}
              alt={item.alt || t('product.viewImage', { index: i + 1 })}
              style={styles.image}
              contentFit="contain"
              transition={150}
            />
          </View>
        )}
      />
      {badge ? <View style={styles.badge}>{badge}</View> : null}
      {images.length > 1 ? (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {images.map((image, i) => (
            <View
              key={`${image.url}-${i}`}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.link : colors.borderStrong },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { flex: 1 },
  badge: { position: 'absolute', top: spacing.lg, left: spacing.lg },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
});
