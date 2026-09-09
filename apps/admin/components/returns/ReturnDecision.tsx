'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReturnStatus } from '@tamizh/db/enums';
import { formatINR } from '@tamizh/core/money';
import { cn } from '@tamizh/core/utils';
import type { TranslationKey } from '@/i18n';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError, TextAreaField, TextField } from '@/components/ui/Field';

/**
 * Moves a return to its next state.
 *
 * The offered steps come from the server's own transition table, so the UI
 * can never present a step the API would refuse. When goods are marked
 * received, each line has to be judged individually — resaleable stock goes
 * back on the shelf, damaged stock does not, and the difference is written
 * into the inventory ledger.
 */

const STATUS_LABELS: Record<ReturnStatus, TranslationKey> = {
  REQUESTED: 'return.REQUESTED',
  APPROVED: 'return.APPROVED',
  REJECTED: 'return.REJECTED',
  PICKUP_SCHEDULED: 'return.PICKUP_SCHEDULED',
  RECEIVED: 'return.RECEIVED',
  REFUND_PENDING: 'return.REFUND_PENDING',
  REFUNDED: 'return.REFUNDED',
  CLOSED: 'return.CLOSED',
};

export interface ReturnLine {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  outcome: string | null;
}

export function ReturnDecision({
  returnNumber,
  current,
  next,
  lines,
}: {
  returnNumber: string;
  current: ReturnStatus;
  next: ReturnStatus[];
  lines: ReturnLine[];
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [target, setTarget] = useState<ReturnStatus | null>(null);
  const [note, setNote] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [outcomes, setOutcomes] = useState<Record<string, 'RESTOCK' | 'DAMAGED'>>(
    Object.fromEntries(
      lines.filter((line) => !line.outcome).map((line) => [line.id, 'RESTOCK' as const]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (next.length === 0) {
    return <p className="text-sm text-slate-500">{t('returns.noNextStep')}</p>;
  }

  const submit = async () => {
    if (!target) return;
    setError(null);

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }
    if (target === 'REJECTED' && note.trim().length < 3) {
      setError(t('returns.decisionNote'));
      return;
    }

    setBusy(true);
    try {
      await api.patch(`/api/admin/returns/${returnNumber}`, {
        status: target,
        note: note.trim() || undefined,
        pickupAt: target === 'PICKUP_SCHEDULED' && pickupAt ? pickupAt : undefined,
        outcomes:
          target === 'RECEIVED'
            ? Object.entries(outcomes).map(([returnItemId, outcome]) => ({
                returnItemId,
                outcome,
              }))
            : undefined,
      });
      toast(t('returns.updated'));
      setTarget(null);
      setNote('');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const unjudged = lines.filter((line) => !line.outcome);

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          {t('returns.nextStep')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {next.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setTarget(status === target ? null : status)}
              aria-pressed={target === status}
              className={cn(
                'min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors',
                target === status
                  ? status === 'REJECTED'
                    ? 'border-critical-500 bg-critical-50 text-critical-600'
                    : 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400',
              )}
            >
              {t(STATUS_LABELS[status])}
            </button>
          ))}
        </div>
      </fieldset>

      {target === 'PICKUP_SCHEDULED' ? (
        <TextField
          label={t('returns.pickupDate')}
          type="date"
          value={pickupAt}
          onChange={(event) => setPickupAt(event.target.value)}
        />
      ) : null}

      {target === 'RECEIVED' && unjudged.length > 0 ? (
        <div>
          <p className="mb-2 text-sm text-slate-600">{t('returns.inspect')}</p>
          <ul className="space-y-2">
            {unjudged.map((line) => (
              <li
                key={line.id}
                className="rounded-lg border border-slate-200 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-slate-900">{line.name}</p>
                <p className="mb-2 font-mono text-xs text-slate-500">
                  {line.sku} · {line.quantity} × {formatINR(line.unitPrice)}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['RESTOCK', t('returns.restock')],
                      ['DAMAGED', t('returns.damaged')],
                    ] as ['RESTOCK' | 'DAMAGED', string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setOutcomes((current) => ({ ...current, [line.id]: value }))
                      }
                      aria-pressed={outcomes[line.id] === value}
                      className={cn(
                        'min-h-10 rounded-lg border px-2 text-sm font-medium',
                        outcomes[line.id] === value
                          ? value === 'RESTOCK'
                            ? 'border-positive-500 bg-positive-50 text-positive-600'
                            : 'border-caution-500 bg-caution-50 text-caution-600'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {target ? (
        <>
          <TextAreaField
            label={t('returns.decisionNote')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            required={target === 'REJECTED'}
            optionalLabel={target === 'REJECTED' ? undefined : t('common.optional')}
          />
          <Button
            fullWidth
            loading={busy}
            disabled={!online}
            variant={target === 'REJECTED' ? 'danger' : 'primary'}
            onClick={() => void submit()}
          >
            {t(STATUS_LABELS[target])}
          </Button>
        </>
      ) : null}

      <p className="text-xs text-slate-400">
        {t('common.status')}: {t(STATUS_LABELS[current])}
      </p>
    </div>
  );
}
