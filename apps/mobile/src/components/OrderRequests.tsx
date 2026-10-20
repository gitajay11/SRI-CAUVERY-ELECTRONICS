import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  cancellationStage,
  isRefundProblem,
  NO_REFUND_TRACK,
  REFUND_TRACK,
  stageIndex,
} from '@tamizh/core/cancellation';
import { formatINR } from '@tamizh/core/money';
import type { CancellationRequestView } from '@tamizh/core/types';
import { formatDate } from '@tamizh/core/utils';
import { Field, FormMessage } from '@/components/Field';
import { AppText, Button } from '@/components/ui';
import { useRequestCancellation, useRequestReturn, type ReturnEligibility } from '@/lib/account';
import { ApiError } from '@/lib/api';
import { localName } from '@/lib/catalog';
import { useLocale } from '@/lib/i18n';
import { radius, spacing, useColors } from '@/theme/colors';

function errorText(error: unknown, fallback: string): string | null {
  if (!error) return null;
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * A cancellation's progress, from the request to any refund, by the shared
 * rule in @tamizh/core/cancellation — the same stages the website and the
 * admin panel show.
 */
export function CancellationCard({
  request,
  paid,
}: {
  request: CancellationRequestView;
  paid: boolean;
}) {
  const { t } = useLocale();
  const colors = useColors();
  const stage = cancellationStage(request);
  const denied = stage === 'DENIED';
  const problem = isRefundProblem(stage);
  const expectsRefund = request.refund !== null || (paid && stage !== 'APPROVED');
  const track = expectsRefund ? REFUND_TRACK : NO_REFUND_TRACK;
  const current = stageIndex(stage, track);
  const amount = request.refund ? formatINR(request.refund.amount) : '';
  const note =
    stage === 'APPROVED' && !expectsRefund
      ? t('order.cancellation.note.APPROVED_NO_REFUND')
      : t(`order.cancellation.note.${stage}`, {
          amount,
          date: request.refund?.processedAt ? formatDate(request.refund.processedAt) : '',
        });
  const bad = denied || problem;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bad ? colors.dangerSoft : colors.accentSoft,
          borderColor: bad ? colors.danger : colors.action,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="heading">{t('order.cancellation.title')}</AppText>
          <AppText variant="small" tone="muted">
            {t('order.cancellation.request', { number: request.requestNumber })}
          </AppText>
        </View>
        <AppText style={styles.bold} tone={bad ? 'danger' : 'link'}>
          {t(`order.cancellation.stage.${stage}`)}
        </AppText>
      </View>

      {denied ? null : (
        <View style={styles.steps}>
          {track.map((step, index) => {
            const done = current >= index;
            const failedHere = problem && index === current;
            return (
              <View key={step} style={styles.step}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: failedHere
                        ? colors.danger
                        : done
                          ? colors.link
                          : colors.borderStrong,
                    },
                  ]}
                >
                  <AppText variant="label" style={{ color: colors.surface }}>
                    {failedHere ? '!' : index + 1}
                  </AppText>
                </View>
                <AppText variant="small" tone={done ? 'default' : 'faint'} style={styles.flex}>
                  {t(`order.cancellation.stage.${step}`)}
                </AppText>
              </View>
            );
          })}
        </View>
      )}

      <AppText>{note}</AppText>
      {request.decisionNote ? <AppText tone="muted">“{request.decisionNote}”</AppText> : null}
      {request.handledAt ? (
        <AppText variant="small" tone="faint">
          {t('order.cancellation.decidedOn', { date: formatDate(request.handledAt) })}
        </AppText>
      ) : null}
    </View>
  );
}

/** "Request cancellation": a reason, then a request for staff to decide. */
export function CancelRequest({ orderNumber }: { orderNumber: string }) {
  const { t } = useLocale();
  const colors = useColors();
  const cancel = useRequestCancellation(orderNumber);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <Button label={t('order.cancelRequest')} variant="outline" onPress={() => setOpen(true)} />
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
      <AppText tone="danger" style={styles.bold}>
        {t('order.cancelRequestConfirm')}
      </AppText>
      <Field
        label={t('order.cancelReason')}
        value={reason}
        onChangeText={setReason}
        multiline
        style={styles.textArea}
      />
      {errorText(cancel.error, t('error.body')) ? (
        <FormMessage text={errorText(cancel.error, t('error.body'))!} />
      ) : null}
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button label={t('common.back')} variant="outline" onPress={() => setOpen(false)} />
        </View>
        <View style={styles.flex}>
          <Button
            label={t('order.cancelRequestSubmit')}
            loading={cancel.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => cancel.mutate(reason.trim(), { onSuccess: () => setOpen(false) })}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * A return request: which lines and how many, and why. The server checks the
 * window, the delivery and the quantities again; nothing here promises a refund.
 */
export function ReturnRequest({
  orderNumber,
  returns,
}: {
  orderNumber: string;
  returns: ReturnEligibility;
}) {
  const { t, locale } = useLocale();
  const colors = useColors();
  const request = useRequestReturn(orderNumber);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  if (returns.pending) {
    return <FormMessage text={t('order.returnPending')} tone="info" />;
  }
  if (sent) return <FormMessage text={t('order.returnRaised')} tone="info" />;
  if (returns.returnable.length === 0) return null;
  if (!open) {
    return (
      <Button label={t('order.requestReturn')} variant="outline" onPress={() => setOpen(true)} />
    );
  }

  const items = Object.entries(chosen)
    .filter(([, quantity]) => quantity > 0)
    .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="heading">{t('order.returnTitle')}</AppText>
      <AppText variant="small" tone="muted">
        {t('order.returnWindow', { days: returns.windowDays })}
      </AppText>

      {returns.returnable.map((line) => {
        const quantity = chosen[line.id] ?? 0;
        const set = (next: number) =>
          setChosen((previous) => ({
            ...previous,
            [line.id]: Math.max(0, Math.min(line.quantity, next)),
          }));
        return (
          <View key={line.id} style={[styles.returnLine, { borderBottomColor: colors.border }]}>
            <View style={styles.flex}>
              <AppText numberOfLines={2}>{localName(line, locale)}</AppText>
              <AppText variant="small" tone="muted">
                {t('order.returnQuantity')} (≤ {line.quantity})
              </AppText>
            </View>
            <View style={[styles.stepper, { borderColor: colors.borderStrong }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('product.decrease')}
                onPress={() => set(quantity - 1)}
                disabled={quantity === 0}
                style={[styles.stepButton, quantity === 0 && styles.dim]}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <AppText style={styles.quantity}>{quantity}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('product.increase')}
                onPress={() => set(quantity + 1)}
                disabled={quantity >= line.quantity}
                style={[styles.stepButton, quantity >= line.quantity && styles.dim]}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>
        );
      })}

      <Field label={t('order.returnReason')} value={reason} onChangeText={setReason} />
      <Field
        label={t('order.returnComment')}
        optionalLabel={t('common.optional')}
        value={comment}
        onChangeText={setComment}
        multiline
        style={styles.textArea}
      />
      {errorText(request.error, t('error.body')) ? (
        <FormMessage text={errorText(request.error, t('error.body'))!} />
      ) : null}
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button label={t('common.back')} variant="outline" onPress={() => setOpen(false)} />
        </View>
        <View style={styles.flex}>
          <Button
            label={t('order.returnSubmit')}
            loading={request.isPending}
            disabled={items.length === 0 || reason.trim().length < 3}
            onPress={() =>
              request.mutate(
                { reason: reason.trim(), comment: comment.trim() || undefined, items },
                { onSuccess: () => setSent(true) },
              )
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  steps: { gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  textArea: { minHeight: 80, paddingTop: spacing.md, textAlignVertical: 'top' },
  returnLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  stepButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
  quantity: { minWidth: 28, textAlign: 'center', fontWeight: '700' },
  bold: { fontWeight: '700' },
});
