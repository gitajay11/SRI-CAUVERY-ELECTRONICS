import { StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import type { CartTotals } from '@tamizh/core/types';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { spacing, useColors } from '@/theme/colors';

/** The price breakdown, exactly as the server worked it out. */
export function PriceSummary({
  totals,
  couponCode,
}: {
  totals: CartTotals;
  couponCode?: string | null;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const savings = totals.productDiscount + totals.couponDiscount;

  return (
    <View style={styles.summary}>
      <Row label={t('cart.subtotal')} value={formatINR(totals.mrpTotal)} />
      {totals.productDiscount > 0 ? (
        <Row
          label={t('cart.productDiscount')}
          value={`− ${formatINR(totals.productDiscount)}`}
          good
        />
      ) : null}
      {totals.couponDiscount > 0 ? (
        <Row
          label={t('cart.couponDiscount', { code: couponCode ?? '' })}
          value={`− ${formatINR(totals.couponDiscount)}`}
          good
        />
      ) : null}
      <Row
        label={t('cart.shipping')}
        value={totals.shippingFee === 0 ? t('cart.shippingFree') : formatINR(totals.shippingFee)}
        good={totals.shippingFee === 0}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.row}>
        <AppText variant="heading">{t('cart.total')}</AppText>
        <AppText variant="heading">{formatINR(totals.total)}</AppText>
      </View>
      {savings > 0 ? (
        <AppText variant="small" tone="link" style={styles.bold}>
          {t('cart.savings', { amount: formatINR(savings) })}
        </AppText>
      ) : null}
    </View>
  );
}

function Row({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted">{label}</AppText>
      <AppText tone={good ? 'link' : 'default'} style={good ? styles.bold : undefined}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  bold: { fontWeight: '700' },
});
