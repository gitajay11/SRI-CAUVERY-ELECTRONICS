'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertIcon, RefreshIcon } from '@/components/ui/Icons';
import { useAdmin } from '@/components/providers/AdminProviders';

/**
 * Route-level error boundary.
 *
 * The message is generic; the real error goes to the console and, in
 * production, to the host's log drain. An admin panel showing a raw stack
 * trace would leak table and column names.
 */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useAdmin();

  useEffect(() => {
    console.error('[admin] route error', error);
  }, [error]);

  return (
    <div className="rounded-panel border border-slate-200 bg-surface px-6 py-14 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-critical-50 text-2xl text-critical-500">
        <AlertIcon />
      </span>
      <h1 className="text-lg font-semibold text-slate-900">{t('error.title')}</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{t('error.body')}</p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6">
        <Button onClick={reset}>
          <RefreshIcon className="text-[1.1em]" />
          {t('common.retry')}
        </Button>
      </div>
    </div>
  );
}
