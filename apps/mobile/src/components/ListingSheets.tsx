import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { paiseToRupees } from '@tamizh/core/money';
import { SORT_KEYS, type ProductFacets, type SortKey } from '@tamizh/core/types';
import { Chip } from '@/components/Chip';
import { Sheet } from '@/components/Sheet';
import { AppText, Button } from '@/components/ui';
import type { ProductFilters } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/** Choose one sort order; choosing closes the sheet. */
export function SortSheet({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: SortKey;
  onChange: (sort: SortKey) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const colors = useColors();
  return (
    <Sheet visible={visible} title={t('shop.sortBy')} onClose={onClose}>
      <View accessibilityRole="radiogroup">
        {SORT_KEYS.map((key) => {
          const selected = key === value;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                onChange(key);
                onClose();
              }}
              style={[styles.option, { borderBottomColor: colors.border }]}
            >
              <AppText style={{ fontWeight: selected ? '700' : '400' }}>
                {t(`shop.sort.${key}`)}
              </AppText>
              {selected ? <Ionicons name="checkmark" size={22} color={colors.link} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

type OptionalFilters = Pick<
  ProductFilters,
  'brands' | 'minPrice' | 'maxPrice' | 'minRating' | 'minDiscount' | 'inStock'
>;

const RATINGS = [4, 3];
const DISCOUNTS = [10, 25, 50];

/**
 * The filters, edited as a draft and applied together, so the grid does not
 * reload under the shopper's thumb at every tap.
 */
export function FilterSheet({
  visible,
  value,
  facets,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: OptionalFilters;
  facets: ProductFacets | undefined;
  onApply: (filters: OptionalFilters) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const [draft, setDraft] = useState<OptionalFilters>(value);
  const [minText, setMinText] = useState(value.minPrice?.toString() ?? '');
  const [maxText, setMaxText] = useState(value.maxPrice?.toString() ?? '');

  // Each opening starts from what is applied, not from an abandoned draft.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(value);
      setMinText(value.minPrice?.toString() ?? '');
      setMaxText(value.maxPrice?.toString() ?? '');
    }
  }

  const toggleBrand = (brand: string) => {
    const current = new Set(draft.brands ?? []);
    if (current.has(brand)) current.delete(brand);
    else current.add(brand);
    setDraft({ ...draft, brands: current.size ? [...current] : undefined });
  };

  const rupees = (text: string): number | undefined => {
    const value = Number.parseInt(text.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(value) ? value : undefined;
  };

  const apply = () => {
    onApply({ ...draft, minPrice: rupees(minText), maxPrice: rupees(maxText) });
    onClose();
  };

  const clear = () => {
    setDraft({});
    setMinText('');
    setMaxText('');
  };

  const inputStyle = [
    styles.input,
    { borderColor: colors.borderStrong, color: colors.text, backgroundColor: colors.surface },
  ];

  return (
    <Sheet
      visible={visible}
      title={t('shop.filters')}
      onClose={onClose}
      footer={
        <>
          <View style={styles.flex}>
            <Button label={t('common.clearAll')} variant="outline" onPress={clear} />
          </View>
          <View style={styles.flex}>
            <Button label={t('common.apply')} onPress={apply} />
          </View>
        </>
      }
    >
      <View style={styles.switchRow}>
        <AppText>{t('shop.filter.inStock')}</AppText>
        <Switch
          value={Boolean(draft.inStock)}
          onValueChange={(inStock) => setDraft({ ...draft, inStock: inStock || undefined })}
          trackColor={{ true: colors.action }}
        />
      </View>

      <Section title={t('shop.filter.price')}>
        <View style={styles.priceRow}>
          <TextInput
            value={minText}
            onChangeText={setMinText}
            placeholder={
              facets ? `${t('shop.filter.min')} ₹${paiseToRupees(facets.priceMin)}` : t('shop.filter.min')
            }
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            accessibilityLabel={t('shop.filter.min')}
            style={inputStyle}
          />
          <AppText tone="faint">–</AppText>
          <TextInput
            value={maxText}
            onChangeText={setMaxText}
            placeholder={
              facets ? `${t('shop.filter.max')} ₹${paiseToRupees(facets.priceMax)}` : t('shop.filter.max')
            }
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            accessibilityLabel={t('shop.filter.max')}
            style={inputStyle}
          />
        </View>
      </Section>

      {facets && facets.brands.length > 0 ? (
        <Section title={t('shop.filter.brand')}>
          <View style={styles.chips}>
            {facets.brands.map((brand) => (
              <Chip
                key={brand.value}
                label={`${brand.label} (${brand.count})`}
                selected={draft.brands?.includes(brand.value) ?? false}
                onPress={() => toggleBrand(brand.value)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title={t('shop.filter.rating')}>
        <View style={styles.chips}>
          {RATINGS.map((rating) => (
            <Chip
              key={rating}
              label={t('shop.filter.ratingAndUp', { rating })}
              selected={draft.minRating === rating}
              onPress={() =>
                setDraft({ ...draft, minRating: draft.minRating === rating ? undefined : rating })
              }
            />
          ))}
        </View>
      </Section>

      <Section title={t('shop.filter.discount')}>
        <View style={styles.chips}>
          {DISCOUNTS.map((percent) => (
            <Chip
              key={percent}
              label={t('shop.filter.discountAndUp', { percent })}
              selected={draft.minDiscount === percent}
              onPress={() =>
                setDraft({
                  ...draft,
                  minDiscount: draft.minDiscount === percent ? undefined : percent,
                })
              }
            />
          ))}
        </View>
      </Section>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="faint">
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
