'use client';

import { useState } from 'react';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { useNavigation } from '@/hooks/useNavigation';

/** Ends every session except the one making the request. */
export function EndOtherSessions() {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { refresh, pending } = useNavigation();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      loading={busy || pending}
      disabled={!online}
      onClick={async () => {
        const confirmed = await confirm({
          title: t('account.endOthers'),
          confirmLabel: t('account.endSession'),
          tone: 'danger',
        });
        if (!confirmed) return;

        setBusy(true);
        try {
          await api.delete('/api/admin/account/sessions');
          toast(t('account.endedOthers'));
          refresh();
        } catch (caught) {
          toast(
            caught instanceof ApiError ? caught.message : t('error.saveFailed'),
            'error',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {t('account.endOthers')}
    </Button>
  );
}
