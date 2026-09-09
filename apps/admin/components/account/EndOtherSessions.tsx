'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';

/** Ends every session except the one making the request. */
export function EndOtherSessions() {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      loading={busy}
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
          router.refresh();
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
