'use client';

import { useState } from 'react';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { useNavigation } from '@/hooks/useNavigation';

/**
 * Blocks or unblocks a customer.
 *
 * Blocking asks for a reason before it will proceed — six months later, "why
 * is this account blocked?" is the only question anyone asks, and the audit
 * log is the only place that can answer it.
 */
export function BlockCustomerButton({
  id,
  name,
  blocked,
}: {
  id: string;
  name: string;
  blocked: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { refresh, pending } = useNavigation();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const confirmed = await confirm({
      title: blocked
        ? t('customers.unblockConfirm', { name })
        : t('customers.blockConfirm', { name }),
      confirmLabel: blocked ? t('customers.unblock') : t('customers.block'),
      tone: blocked ? 'default' : 'danger',
      reasonLabel: blocked ? undefined : t('customers.blockReason'),
    });
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/admin/customers/${id}`, {
        blocked: !blocked,
        reason: typeof confirmed === 'string' ? confirmed : undefined,
      });
      toast(blocked ? t('customers.wasUnblocked') : t('customers.wasBlocked'));
      refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {error ? <FormError>{error}</FormError> : null}
      <Button
        variant={blocked ? 'outline' : 'dangerGhost'}
        loading={busy || pending}
        disabled={!online}
        onClick={() => void run()}
      >
        {blocked ? t('customers.unblock') : t('customers.block')}
      </Button>
    </div>
  );
}
