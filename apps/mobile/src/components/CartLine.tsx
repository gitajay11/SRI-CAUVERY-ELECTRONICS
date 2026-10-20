import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import { maxQuantity, quantityRuleFor, stepDown, stepUp } from '@tamizh/core/quantity';
import type { CartItemView } from '@tamizh/core/types';
import { AppText } from '@/components/ui';
import { localName } from '@/lib/catalog';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * One cart line: image, name, price, a stepper bound by the same quantity
 * rules as the product page, and remove.
 */
export function CartLine({
  item,
  busy,
  onQuantity,
}: {
  item: CartItemView;
  busy: boolean;
  onQuantity: (quantity: number) => void;
}) {
  const colors = useColors();
  const { t, locale } = useLocale();
  const rule = quantityRuleFor(item);
  const max = maxQuantity(rule, item.availableStock);
  const name = localName(item, locale);

  return (
    <View style={[styles.line, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={name}
        onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: item.slug } })}
        style={[styles.thumb, { backgroundColor: colors.raised }]}
      >
        {item.image ? (
          <Image
            source={{ uri: assetUrl(item.image.url) }}
            style={styles.image}
            contentFit="contain"
          />
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <AppText numberOfLines={2}>{name}</AppText>
        {item.variantName ? (
          <AppText variant="small" tone="muted">
            {item.variantName}
          </AppText>
        ) : null}
        <View style={styles.prices}>
          <AppText style={styles.bold}>{formatINR(item.unitPrice)}</AppText>
          {item.mrp > item.unitPrice ? (
            <AppText variant="small" tone="faint" style={styles.mrp}>
              {formatINR(item.mrp)}
            </AppText>
          ) : null}
        </View>

        <View style={styles.controls}>
          <View style={[styles.stepper, { borderColor: colors.borderStrong }]}>
            <Step
              icon="remove"
              label={t('product.decrease')}
              disabled={busy || item.quantity <= rule.min}
              onPress={() => onQuantity(stepDown(item.quantity, rule))}
            />
            <AppText style={styles.quantity}>{item.quantity}</AppText>
            <Step
              icon="add"
              label={t('product.increase')}
              disabled={busy || item.quantity >= max}
              onPress={() => onQuantity(stepUp(item.quantity, rule, item.availableStock))}
            />
          </View>
          <AppText style={[styles.bold, styles.total]}>{formatINR(item.lineTotal)}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('common.remove')} ${name}`}
            disabled={busy}
            onPress={() => onQuantity(0)}
            hitSlop={10}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Step({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.step, disabled && { opacity: 0.35 }]}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  thumb: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden' },
  image: { flex: 1 },
  body: { flex: 1, gap: spacing.xs },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  mrp: { textDecorationLine: 'line-through' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  step: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 32, textAlign: 'center', fontWeight: '700' },
  total: { flex: 1, textAlign: 'right' },
  bold: { fontWeight: '700' },
});
