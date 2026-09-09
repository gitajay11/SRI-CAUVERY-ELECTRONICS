'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StockReason } from '@tamizh/db/enums';
import { cn } from '@tamizh/core/utils';
import type { TranslationKey } from '@/i18n';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError, SelectField, TextAreaField, TextField } from '@/components/ui/Field';

/**
 * Adjust the stock of one product.
 *
 * Three modes, because they are three different real actions: stock arrived,
 * stock left (damage, loss), or a physical count disagrees with the system.
 * The reason is part of the request, never defaulted — the ledger is only
 * worth keeping if every line says why.
 *
 * The projected figure is shown before saving, so nobody has to work out in
 * their head what "−7" does to a count of 4.
 */

type Mode = 'add' | 'remove' | 'set';

/** Every reason's label, keyed literally so the dictionary stays type-checked. */
const REASON_LABELS: Record<StockReason, TranslationKey> = {
  PURCHASE: 'inventory.reason.PURCHASE',
  SALE: 'inventory.reason.SALE',
  MANUAL_ADJUSTMENT: 'inventory.reason.MANUAL_ADJUSTMENT',
  CUSTOMER_RETURN: 'inventory.reason.CUSTOMER_RETURN',
  DAMAGED: 'inventory.reason.DAMAGED',
  LOST: 'inventory.reason.LOST',
  CANCELLED_ORDER: 'inventory.reason.CANCELLED_ORDER',
  STOCK_TAKE: 'inventory.reason.STOCK_TAKE',
};

const REASONS: Record<Mode, StockReason[]> = {
  add: ['PURCHASE', 'CUSTOMER_RETURN', 'MANUAL_ADJUSTMENT'],
  remove: ['DAMAGED', 'LOST', 'MANUAL_ADJUSTMENT'],
  set: ['STOCK_TAKE', 'MANUAL_ADJUSTMENT'],
};

export function StockAdjuster({
  productId,
  productName,
  currentStock,
  compact = false,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  /** Renders without the surrounding heading, for use inside a panel. */
  compact?: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockReason>('PURCHASE');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const amount = Number(quantity);
  const valid = Number.isFinite(amount) && quantity.trim() !== '' && amount >= 0;
  const projected = !valid
    ? currentStock
    : mode === 'set'
      ? amount
      : mode === 'add'
        ? currentStock + amount
        : currentStock - amount;
  const wouldGoNegative = projected < 0;

  const chooseMode = (next: Mode) => {
    setMode(next);
    setReason(REASONS[next][0]!);
    setError(null);
    setFieldError(undefined);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }
    if (!valid) {
      setFieldError(t('error.required'));
      return;
    }
    if (wouldGoNegative) {
      setFieldError(t('inventory.negative'));
      return;
    }

    setBusy(true);
    try {
      const result = await api.post<{ before: number; after: number }>(
        '/api/admin/inventory',
        {
          productId,
          mode: mode === 'set' ? 'set' : 'delta',
          value: mode === 'remove' ? -amount : amount,
          reason,
          note: note.trim() || undefined,
        },
      );
      toast(`${t('inventory.adjusted')} ${result.before} → ${result.after}`);
      setQuantity('');
      setNote('');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldError(caught.fields?.value);
      } else setError(t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {!compact ? (
        <p className="text-sm text-slate-500">
          {t('inventory.adjustTitle', { name: productName })}
        </p>
      ) : null}

      {error ? <FormError>{error}</FormError> : null}

      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('inventory.change')}>
        {(
          [
            ['add', t('inventory.addStock')],
            ['remove', t('inventory.removeStock')],
            ['set', t('inventory.setStock')],
          ] as [Mode, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseMode(value)}
            aria-pressed={mode === value}
            className={cn(
              'min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors',
              mode === value
                ? 'border-brand-500 bg-success-50 text-link'
                : 'border-slate-300 text-slate-600 hover:border-slate-400',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <TextField
        label={mode === 'set' ? t('inventory.newQuantity') : t('common.quantity')}
        type="number"
        min={0}
        inputMode="numeric"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        required
        error={fieldError}
        aside={`${t('inventory.currentStock')}: ${currentStock}`}
      />

      <p
        aria-live="polite"
        className={cn(
          'rounded-lg px-3 py-2.5 text-sm',
          wouldGoNegative ? 'bg-critical-50 text-critical-600' : 'bg-slate-50 text-slate-600',
        )}
      >
        {wouldGoNegative ? (
          t('inventory.negative')
        ) : (
          <>
            {currentStock}
            <span className="mx-1.5" aria-hidden="true">
              →
            </span>
            <strong className="tabular-nums text-slate-900">{projected}</strong>
          </>
        )}
      </p>

      <SelectField
        label={t('common.reason')}
        value={reason}
        onChange={(event) => setReason(event.target.value as StockReason)}
        required
      >
        {REASONS[mode].map((value) => (
          <option key={value} value={value}>
            {t(REASON_LABELS[value])}
          </option>
        ))}
      </SelectField>

      <TextAreaField
        label={t('common.notes')}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        optionalLabel={t('common.optional')}
        placeholder="Invoice number, supplier, who counted it…"
      />

      <Button type="submit" fullWidth loading={busy} disabled={!online || wouldGoNegative}>
        {t('inventory.adjust')}
      </Button>

      <p className="text-xs text-slate-400">{t('inventory.auditNote')}</p>
    </form>
  );
}
