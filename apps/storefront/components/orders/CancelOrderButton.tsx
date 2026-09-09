'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@tamizh/core/types';
import { ApiError, api } from '@/lib/http';
import { CANCELLABLE_STATUSES } from '@tamizh/core/pricing';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { TextAreaField, FormError } from '@/components/ui/Field';

/**
 * Customer-initiated cancellation.
 *
 * Only rendered while the order is still cancellable — the server enforces the
 * same window, and returns stock as part of the cancellation transaction.
 */
export function CancelOrderButton({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(status)) return null;

  if (!open) {
    return (
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        {t('order.cancel')}
      </Button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-card border border-danger-500/25 bg-danger-50/60 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
          await api.post(`/api/orders/${encodeURIComponent(orderNumber)}/cancel`, {
            reason,
          });
          toast(t('order.cancelled'), { tone: 'info' });
          setOpen(false);
          router.refresh();
        } catch (caught) {
          setError(caught instanceof ApiError ? caught.message : t('error.body'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm font-semibold text-danger-600">{t('order.cancelConfirm')}</p>

      <TextAreaField
        label={t('order.cancelReason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        required
        minLength={3}
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
          variant="danger"
          className="flex-1"
          loading={busy}
          disabled={reason.trim().length < 3}
        >
          {t('order.cancel')}
        </Button>
      </div>
    </form>
  );
}
