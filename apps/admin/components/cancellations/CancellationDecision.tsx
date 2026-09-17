'use client';

import { useRef, useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError, TextAreaField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Primitives';
import { useNavigation } from '@/hooks/useNavigation';

/**
 * Approve or reject a customer's cancellation request.
 *
 * Approving is a real cancellation — stock back, refund raised if paid — so
 * the button says so, and the choice has to be made explicitly before the
 * confirm button appears. A request that can no longer be approved (the
 * order has shipped) only offers rejection; the server enforces the same.
 */

type Decision = 'APPROVED' | 'REJECTED';

export function CancellationDecision({
  requestNumber,
  canApprove,
}: {
  requestNumber: string;
  canApprove: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const { refresh, pending } = useNavigation();

  const [target, setTarget] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two clicks before the first response would be two decisions. The server
  // refuses the second anyway; this stops it ever being sent.
  const inFlight = useRef(false);

  const submit = async () => {
    if (!target || inFlight.current) return;
    setError(null);

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }
    if (target === 'REJECTED' && note.trim().length < 3) {
      setError(t('cancellations.noteHint'));
      return;
    }

    inFlight.current = true;
    setBusy(true);
    try {
      await api.patch(`/api/admin/cancellations/${encodeURIComponent(requestNumber)}`, {
        status: target,
        note: note.trim() || undefined,
      });
      toast(t('cancellations.updated'));
      setTarget(null);
      setNote('');
      refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const choices: { value: Decision; label: string; disabled: boolean }[] = [
    { value: 'APPROVED', label: t('cancellations.approve'), disabled: !canApprove },
    { value: 'REJECTED', label: t('cancellations.reject'), disabled: false },
  ];

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      {!canApprove ? <Alert tone="caution">{t('cancellations.notCancellable')}</Alert> : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          {t('cancellations.decision')}
        </legend>
        <div className="grid gap-2">
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              disabled={choice.disabled || busy}
              onClick={() => setTarget(choice.value === target ? null : choice.value)}
              aria-pressed={target === choice.value}
              className={cn(
                'min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                target === choice.value
                  ? choice.value === 'REJECTED'
                    ? 'border-critical-500 bg-critical-50 text-critical-600'
                    : 'border-brand-500 bg-success-50 text-link'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400',
              )}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </fieldset>

      {target ? (
        <>
          {target === 'APPROVED' ? (
            <Alert tone="caution">{t('cancellations.approveWarning')}</Alert>
          ) : null}

          <TextAreaField
            label={t('cancellations.note')}
            hint={t('cancellations.noteHint')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            required={target === 'REJECTED'}
          />

          <Button
            variant={target === 'REJECTED' ? 'danger' : 'primary'}
            fullWidth
            loading={busy || pending}
            onClick={() => void submit()}
          >
            {target === 'REJECTED' ? t('cancellations.reject') : t('cancellations.approve')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
