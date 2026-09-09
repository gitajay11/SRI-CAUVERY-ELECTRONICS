'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/http';
import { useAdmin } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/Icons';

/** Marks every notification read for the signed-in member of staff only. */
export function MarkAllRead() {
  const { t, online } = useAdmin();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      loading={busy}
      disabled={!online}
      onClick={async () => {
        setBusy(true);
        try {
          await api.patch('/api/admin/notifications', {});
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <CheckIcon className="text-[1.05em]" />
      {t('notifications.markAllRead')}
    </Button>
  );
}
