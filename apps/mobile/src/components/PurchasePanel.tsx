import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import {
  exampleQuantities,
  firstQuantity,
  maxQuantity,
  quantityProblem,
  quantityRuleFor,
  stepDown,
  stepUp,
  type QuantityProblem,
} from '@tamizh/core/quantity';
import type { ProductDetailView } from '@tamizh/core/types';
import { AppText, Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAddToCart } from '@/lib/cart';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * Quantity and "Add to cart", under the same rules as the website's panel
 * (@tamizh/core/quantity): ordinary items step by one up to the stock, bulk
 * items start at their minimum, go up in fives, and can also be typed in.
 * The server checks the same rule again on every cart write.
 */
export function PurchasePanel({ product }: { product: ProductDetailView }) {
  const { t } = useLocale();
  const colors = useColors();
  const addToCart = useAddToCart();

  const rule = quantityRuleFor(product);
  const max = maxQuantity(rule, product.stock);
  const outOfStock = max <= 0;

  const [quantity, setQuantity] = useState(() => firstQuantity(rule));
  const [typed, setTyped] = useState(() => String(firstQuantity(rule)));
  const [added, setAdded] = useState(false);

  const typedNumber = Number.parseInt(typed, 10);
  const typedProblem: QuantityProblem | 'empty' | null = !rule.bulk
    ? null
    : typed.trim() === '' || Number.isNaN(typedNumber)
      ? 'empty'
      : quantityProblem(typedNumber, rule, product.stock);

  const stepTo = (next: number) => {
    setQuantity(next);
    setTyped(String(next));
    setAdded(false);
  };

  const typeTo = (raw: string) => {
    const clean = raw.replace(/[^\d]/g, '');
    setTyped(clean);
    setAdded(false);
    const next = Number.parseInt(clean, 10);
    if (!Number.isNaN(next) && quantityProblem(next, rule, product.stock) === null) {
      setQuantity(next);
    }
  };

  const problemText = (problem: QuantityProblem | 'empty'): string => {
    switch (problem) {
      case 'empty':
        return t('product.bulk.enterQuantity');
      case 'below_minimum':
        return t('product.bulk.belowMinimum', { min: rule.min });
      case 'not_a_multiple':
        return t('product.bulk.notMultiple', { step: rule.step, examples: exampleQuantities(rule) });
      case 'above_stock':
        return t('product.bulk.aboveStock', { count: max });
    }
  };

  const add = () => {
    setAdded(false);
    addToCart.mutate(
      { productId: product.id, quantity },
      { onSuccess: () => setAdded(true) },
    );
  };

  if (outOfStock) {
    return (
      <View style={[styles.notice, { backgroundColor: colors.dangerSoft }]}>
        <AppText tone="danger" style={styles.bold}>
          {t('product.outOfStock')}
        </AppText>
      </View>
    );
  }

  const error =
    addToCart.error instanceof ApiError ? addToCart.error.message : addToCart.error ? t('error.body') : null;

  return (
    <View style={styles.panel}>
      <View style={styles.quantityRow}>
        <AppText style={styles.bold}>{t('product.quantity')}</AppText>
        <View style={[styles.stepper, { borderColor: colors.borderStrong }]}>
          <StepButton
            icon="remove"
            label={t('product.decrease')}
            disabled={quantity <= rule.min}
            onPress={() => stepTo(stepDown(quantity, rule))}
          />
          <AppText style={styles.quantity} accessibilityLiveRegion="polite">
            {quantity}
          </AppText>
          <StepButton
            icon="add"
            label={t('product.increase')}
            disabled={quantity >= max}
            onPress={() => stepTo(stepUp(quantity, rule, product.stock))}
          />
        </View>
        {product.stock <= 10 && !rule.bulk ? (
          <AppText variant="small" tone="danger" style={styles.bold}>
            {t('product.lowStock', { count: product.stock })}
          </AppText>
        ) : null}
      </View>

      {rule.bulk ? (
        <View style={[styles.bulk, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
          <AppText style={styles.bold}>{t('product.bulk.title')}</AppText>
          <AppText variant="small" tone="muted">
            {t('product.bulk.rule', { min: rule.min, step: rule.step })}
          </AppText>
          <AppText variant="small">{t('product.bulk.quantityLabel')}</AppText>
          <TextInput
            value={typed}
            onChangeText={typeTo}
            keyboardType="number-pad"
            accessibilityLabel={t('product.bulk.quantityLabel')}
            style={[
              styles.input,
              { borderColor: typedProblem ? colors.danger : colors.borderStrong, color: colors.text },
            ]}
          />
          {typedProblem ? (
            <AppText variant="small" tone="danger">
              {problemText(typedProblem)}
            </AppText>
          ) : (
            <AppText variant="small" tone="muted">
              {t('product.bulk.total', {
                count: quantity,
                unit: formatINR(product.price),
                total: formatINR(product.price * quantity),
              })}
            </AppText>
          )}
        </View>
      ) : null}

      <Button
        label={
          addToCart.isPending
            ? t('product.adding')
            : rule.bulk
              ? t('product.addToCartBulk', { count: quantity })
              : t('product.addToCart')
        }
        onPress={add}
        loading={addToCart.isPending}
        disabled={typedProblem !== null}
      />

      {added ? (
        <View style={[styles.notice, styles.addedRow, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.link} />
          <AppText style={[styles.bold, styles.flex]}>{t('product.added')}</AppText>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/cart')} hitSlop={8}>
            <AppText tone="link" style={styles.bold}>
              {t('nav.cart')} →
            </AppText>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.notice, { backgroundColor: colors.dangerSoft }]}>
          <AppText tone="danger">{error}</AppText>
        </View>
      ) : null}
    </View>
  );
}

function StepButton({
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
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.lg },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.pill },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 44, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  bulk: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderRadius: radius.card },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  notice: { padding: spacing.md, borderRadius: radius.md },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
});
