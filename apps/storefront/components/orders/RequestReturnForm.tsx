'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { TextAreaField, FormError, Select } from '@/components/ui/Field';

/**
 * Customer-initiated return.
 *
 * Only offered on a delivered order inside the shop's return window; the
 * server checks both again, along with how many of each item are actually
 * still returnable. Nothing here promises a refund — the shop decides that
 * once the goods are back.
 */

export interface ReturnableItem {
  id: string;
  name: string;
  nameTa: string | null;
  quantity: number;
  unitPrice: number;
}

export function RequestReturnForm({
  orderNumber,
  items,
  windowDays,
}: {
  orderNumber: string;
  items: ReturnableItem[];
  windowDays: number;
}) {
  const { t, locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  if (!open) {
    return (
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {t('order.requestReturn')}
      </Button>
    );
  }

  const selected = Object.entries(chosen).filter(([, quantity]) => quantity > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (selected.length === 0) {
      setError(t('order.returnNothingSelected'));
      return;
    }

    setBusy(true);
    try {
      await api.post(`/api/orders/${encodeURIComponent(orderNumber)}/return`, {
        reason,
        comment: comment.trim() || undefined,
        items: selected.map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
      });
      toast(t('order.returnRaised'), { tone: 'success' });
      setOpen(false);
      setChosen({});
      setReason('');
      setComment('');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.body'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-card border border-ink-100 bg-ink-50/50 p-4"
    >
      <div>
        <p className="text-sm font-bold text-ink-800">{t('order.returnTitle')}</p>
        <p className="mt-0.5 text-xs text-ink-500">
          {t('order.returnWindow', { days: windowDays })}
        </p>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const quantity = chosen[item.id] ?? 0;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-ink-100 bg-surface px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={quantity > 0}
                onChange={(event) =>
                  setChosen((current) => ({
                    ...current,
                    [item.id]: event.target.checked ? 1 : 0,
                  }))
                }
                aria-label={item.name}
                className="size-4.5 shrink-0 accent-brand-600"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-800">
                  {locale === 'ta' && item.nameTa ? item.nameTa : item.name}
                </span>
                <span className="block text-xs text-ink-500">
                  {item.quantity} × {formatINR(item.unitPrice)}
                </span>
              </span>
              {quantity > 0 && item.quantity > 1 ? (
                <label className="flex items-center gap-1.5 text-xs text-ink-500">
                  <span className="sr-only sm:not-sr-only">{t('order.returnQuantity')}</span>
                  <Select
                    size="xs"
                    value={quantity}
                    onChange={(event) =>
                      setChosen((current) => ({
                        ...current,
                        [item.id]: Number(event.target.value),
                      }))
                    }
                  >
                    {Array.from({ length: item.quantity }, (_, index) => index + 1).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ),
                    )}
                  </Select>
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>

      <TextAreaField
        label={t('order.returnReason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        required
        minLength={3}
      />

      <TextAreaField
        label={t('order.returnComment')}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={2}
      />

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          {t('common.back')}
        </Button>
        <Button
          type="submit"
          className="flex-1"
          loading={busy}
          disabled={selected.length === 0 || reason.trim().length < 3}
        >
          {t('order.returnSubmit')}
        </Button>
      </div>
    </form>
  );
}
