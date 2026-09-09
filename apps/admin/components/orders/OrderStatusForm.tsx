'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@tamizh/db/enums';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Panel } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { FormError, SelectField, TextAreaField, TextField } from '@/components/ui/Field';

/**
 * Moves an order through fulfilment.
 *
 * The status list only offers transitions the server will accept, so an admin
 * is never shown a move that then fails. Cancelling requires a reason and a
 * confirmation, because it returns stock and cannot be undone.
 */
export function OrderStatusForm({
  orderNumber,
  status,
  nextStatuses,
  trackingNumber,
  courier,
}: {
  orderNumber: string;
  status: OrderStatus;
  nextStatuses: OrderStatus[];
  trackingNumber: string | null;
  courier: string | null;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [tracking, setTracking] = useState(trackingNumber ?? '');
  const [courierName, setCourierName] = useState(courier ?? '');
  const [note, setNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only when *moving to* cancelled — an already-cancelled order should not
  // keep asking why.
  const cancelling = nextStatus === 'CANCELLED' && status !== 'CANCELLED';
  const unchanged =
    nextStatus === status &&
    tracking === (trackingNumber ?? '') &&
    courierName === (courier ?? '');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    if (cancelling) {
      const confirmed = await confirm({
        title: t('orders.cancel'),
        body: t('orders.cancelConfirm'),
        confirmLabel: t('orders.cancel'),
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      await api.patch(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
        status: nextStatus,
        trackingNumber: tracking,
        courier: courierName,
        note,
        cancelReason,
      });
      toast(cancelling ? t('orders.cancelled') : t('orders.statusUpdated'));
      setNote('');
      setCancelReason('');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={t('orders.updateStatus')}>
      <form onSubmit={submit} className="space-y-4">
        <SelectField
          label={t('common.status')}
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
        >
          <option value={status}>{t(`status.${status}` as 'status.PENDING')} —</option>
          {nextStatuses.map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}` as 'status.PENDING')}
            </option>
          ))}
        </SelectField>

        {nextStatuses.length === 0 ? (
          <p className="text-sm text-slate-500">
            This order has reached a final state.
          </p>
        ) : null}

        {cancelling ? (
          <TextAreaField
            label={t('orders.cancelReason')}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={3}
            required
          />
        ) : (
          <>
            <TextField
              label={t('orders.trackingNumber')}
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
              optionalLabel={t('common.optional')}
              className="font-mono"
            />
            <TextField
              label={t('orders.courier')}
              value={courierName}
              onChange={(event) => setCourierName(event.target.value)}
              optionalLabel={t('common.optional')}
            />
            <TextAreaField
              label={t('common.notes')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              optionalLabel={t('common.optional')}
              rows={2}
            />
          </>
        )}

        {error ? <FormError>{error}</FormError> : null}

        <Button
          type="submit"
          fullWidth
          loading={busy}
          variant={cancelling ? 'danger' : 'primary'}
          disabled={unchanged && !cancelling}
        >
          {cancelling ? t('orders.cancel') : t('common.save')}
        </Button>
      </form>
    </Panel>
  );
}
