'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR, paiseToRupees } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError, MoneyField, TextAreaField } from '@/components/ui/Field';

/**
 * Raises a refund for approval.
 *
 * The ceiling shown here is what the server computed as still refundable; the
 * server checks it again on submit. Raising is not paying — the refund lands
 * in the approval queue, and the money only moves when someone with the right
 * permission says so and records a reference.
 */
export function RaiseRefund({
  orderId,
  returnRequestId,
  available,
  suggested,
}: {
  orderId: string;
  returnRequestId?: string;
  /** Paise still refundable on the order. */
  available: number;
  suggested?: number;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [amount, setAmount] = useState(
    suggested && suggested > 0 ? String(paiseToRupees(suggested)) : '',
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (available <= 0) {
    return <p className="text-sm text-slate-500">{t('refunds.empty')}</p>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }
    if (paiseToRupees(available) < Number(amount)) {
      setFields({ amount: t('refunds.exceedsOrder') });
      return;
    }

    setBusy(true);
    try {
      await api.post('/api/admin/refunds', {
        orderId,
        returnRequestId: returnRequestId ?? null,
        amount: Number(amount) || 0,
        reason,
      });
      toast(t('refunds.raised'));
      setAmount('');
      setReason('');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else setError(t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      <MoneyField
        label={t('refunds.amount')}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
        error={fields.amount}
        hint={t('refunds.maxRefundable', { amount: formatINR(available) })}
      />

      <TextAreaField
        label={t('refunds.reason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        required
        error={fields.reason}
      />

      <Button type="submit" fullWidth loading={busy} disabled={!online}>
        {t('returns.raiseRefund')}
      </Button>

      <p className="text-xs text-slate-400">{t('refunds.approvalNote')}</p>
    </form>
  );
}
