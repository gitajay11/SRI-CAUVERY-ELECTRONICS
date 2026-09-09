'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RefundStatus } from '@tamizh/db/enums';
import { formatINR } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError, TextField } from '@/components/ui/Field';

/**
 * Approve, reject or settle one refund.
 *
 * Approving and settling are separate on purpose: approval authorises money to
 * leave, settling records that it did, and settling will not go through
 * without a transaction reference to point at afterwards.
 */
export function RefundDecision({
  id,
  status,
  amount,
  orderNumber,
  canApprove,
}: {
  id: string;
  status: RefundStatus;
  amount: number;
  orderNumber: string;
  canApprove: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [settling, setSettling] = useState(false);
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canApprove) return null;

  const patch = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/admin/refunds/${id}`, body);
      toast(success);
      setSettling(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    const confirmed = await confirm({
      title: `${t('refunds.approve')} — ${formatINR(amount)}`,
      body: `${orderNumber}. ${t('refunds.approvalNote')}`,
      confirmLabel: t('refunds.approve'),
    });
    if (!confirmed) return;
    await patch({ status: 'APPROVED' }, t('refunds.approved'));
  };

  const reject = async () => {
    const reason = await confirm({
      title: t('refunds.reject'),
      body: `${orderNumber} — ${formatINR(amount)}`,
      confirmLabel: t('refunds.reject'),
      tone: 'danger',
      reasonLabel: t('refunds.rejectReason'),
    });
    if (!reason) return;
    await patch(
      { status: 'REJECTED', note: typeof reason === 'string' ? reason : undefined },
      t('refunds.rejected'),
    );
  };

  const settle = async () => {
    if (!reference.trim()) {
      setError(t('refunds.referenceRequired'));
      return;
    }
    await patch(
      { status: 'COMPLETED', reference, method: method.trim() || undefined },
      t('refunds.completed'),
    );
  };

  const disabled = !online || busy;

  return (
    <div className="space-y-3">
      {error ? <FormError>{error}</FormError> : null}

      {settling ? (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <TextField
            label={t('refunds.reference')}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            required
            className="font-mono"
          />
          <TextField
            label={t('refunds.method')}
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            placeholder="UPI, bank transfer, original payment method"
            optionalLabel={t('common.optional')}
          />
          <div className="flex gap-2">
            <Button size="sm" loading={busy} disabled={disabled} onClick={() => void settle()}>
              {t('refunds.complete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSettling(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status === 'PENDING' ? (
            <>
              <Button size="sm" disabled={disabled} onClick={() => void approve()}>
                {t('refunds.approve')}
              </Button>
              <Button
                size="sm"
                variant="dangerGhost"
                disabled={disabled}
                onClick={() => void reject()}
              >
                {t('refunds.reject')}
              </Button>
            </>
          ) : null}

          {status === 'APPROVED' || status === 'PROCESSING' || status === 'FAILED' ? (
            <Button size="sm" disabled={disabled} onClick={() => setSettling(true)}>
              {t('refunds.complete')}
            </Button>
          ) : null}

          {status === 'APPROVED' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => void patch({ status: 'PROCESSING' }, t('common.saved'))}
            >
              {t('refunds.markProcessing')}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
