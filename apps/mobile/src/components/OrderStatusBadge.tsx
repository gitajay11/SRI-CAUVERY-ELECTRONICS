import { StyleSheet, View } from 'react-native';
import type { OrderStatus } from '@tamizh/core/types';
import { AppText } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors, type Palette } from '@/theme/colors';

/** The website's colour for each order state: delivered good, cancelled bad, moving gold. */
function toneOf(status: OrderStatus, colors: Palette): { background: string; text: string } {
  switch (status) {
    case 'DELIVERED':
      return { background: colors.accentSoft, text: colors.link };
    case 'CANCELLED':
    case 'RETURNED':
      return { background: colors.dangerSoft, text: colors.danger };
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return { background: colors.action, text: colors.onAction };
    case 'REFUNDED':
      return { background: colors.raised, text: colors.textMuted };
    default:
      return { background: colors.sunken, text: colors.text };
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useLocale();
  const colors = useColors();
  const tone = toneOf(status, colors);
  return (
    <View style={[styles.badge, { backgroundColor: tone.background, borderColor: colors.border }]}>
      <AppText variant="label" style={{ color: tone.text }}>
        {t(`order.status.${status}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
