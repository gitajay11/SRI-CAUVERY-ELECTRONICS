import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import type { OrderReview, ReviewLine } from '@shop/order-review';
import { FormMessage } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { AppText, Button } from '@/components/ui';
import { localName } from '@/lib/catalog';
import { assetUrl } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

/**
 * What "Confirm order" would place, as the server just worked it out. When
 * anything moved since the shopper last looked, the changes are marked and
 * confirming waits until they accept them.
 */
export function OrderReviewSheet({
  review,
  visible,
  confirming,
  accepting,
  error,
  onAccept,
  onConfirm,
  onEditCart,
  onClose,
}: {
  review: OrderReview | null;
  visible: boolean;
  confirming: boolean;
  accepting: boolean;
  error: string | null;
  onAccept: () => void;
  onConfirm: () => void;
  onEditCart: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const colors = useColors();
  if (!review) return null;

  const { totals, address, delivery, coupon } = review;
  const empty = review.lines.length === 0;

  return (
    <Sheet
      visible={visible}
      title={t('review.title')}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          {empty ? (
            <Button label={t('review.editCart')} onPress={onEditCart} />
          ) : review.changed ? (
            <Button label={t('review.accept')} onPress={onAccept} loading={accepting} />
          ) : (
            <Button
              label={confirming ? t('review.confirming') : t('review.confirm')}
              onPress={onConfirm}
              loading={confirming}
            />
          )}
        </View>
      }
    >
      {review.changed ? (
        <View
          style={[
            styles.changed,
            { backgroundColor: colors.accentSoft, borderColor: colors.action },
          ]}
        >
          <AppText style={styles.bold}>{t('review.changedTitle')}</AppText>
          <AppText variant="small" tone="muted">
            {t('review.changedBody')}
          </AppText>
        </View>
      ) : null}
      {error ? <FormMessage text={error} /> : null}

      <Section title={t('review.items')}>
        {review.lines.map((line) => (
          <Line key={`${line.productId}:${line.variantId ?? ''}`} line={line} />
        ))}
        {review.removed.length > 0 ? (
          <AppText variant="small" tone="danger">
            {t('review.removed')} ({review.removed.length})
          </AppText>
        ) : null}
      </Section>

      <Section title={t('review.summary')}>
        <Row label={t('cart.subtotal')} value={formatINR(totals.subtotal)} />
        {totals.couponDiscount > 0 ? (
          <Row
            label={t('cart.couponDiscount', { code: coupon?.code ?? '' })}
            value={`− ${formatINR(totals.couponDiscount)}`}
          />
        ) : null}
        <Row
          label={t('cart.shipping')}
          value={totals.shippingFee === 0 ? t('cart.shippingFree') : formatINR(totals.shippingFee)}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <AppText variant="heading">{t('review.grandTotal')}</AppText>
          <AppText variant="heading">{formatINR(totals.total)}</AppText>
        </View>
      </Section>

      <Section title={t('review.address')}>
        <AppText style={styles.bold}>
          {address.name} · {address.phone}
        </AppText>
        <AppText tone="muted">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.district},{' '}
          {address.state} {address.pincode}
        </AppText>
      </Section>

      {delivery ? (
        <Section title={t('review.eta')}>
          <AppText>
            {formatDate(delivery.earliest)} – {formatDate(delivery.latest)}
          </AppText>
        </Section>
      ) : null}

      <Section title={t('review.payment')}>
        <View style={styles.cod}>
          <Ionicons name="cash-outline" size={20} color={colors.link} />
          <AppText style={styles.flex}>
            {t('review.codLine', { amount: formatINR(totals.total) })}
          </AppText>
        </View>
      </Section>
    </Sheet>
  );
}

function Line({ line }: { line: ReviewLine }) {
  const { t, locale } = useLocale();
  const colors = useColors();
  return (
    <View style={styles.line}>
      <View style={[styles.thumb, { backgroundColor: colors.raised }]}>
        {line.image ? (
          <Image
            source={{ uri: assetUrl(line.image.url) }}
            style={styles.flex}
            contentFit="contain"
          />
        ) : null}
      </View>
      <View style={styles.flex}>
        <AppText numberOfLines={2}>{localName(line, locale)}</AppText>
        <AppText variant="small" tone="muted">
          {t('review.qtyPrice', { qty: line.quantity, price: formatINR(line.unitPrice) })}
        </AppText>
        {line.changes.map((change) => (
          <AppText key={change.type} variant="small" tone="danger" style={styles.bold}>
            {change.type === 'price'
              ? t('review.priceChanged', {
                  before: formatINR(change.previousUnitPrice),
                  after: formatINR(line.unitPrice),
                })
              : t('review.qtyChanged', { qty: line.quantity, before: change.previousQuantity })}
          </AppText>
        ))}
      </View>
      <AppText style={styles.bold}>{formatINR(line.lineTotal)}</AppText>
    </View>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1 },
  changed: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
  section: { gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  cod: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
});
