'use client';

import { useEffect, useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { CheckIcon, WifiOffIcon } from '@/components/ui/Icons';

/**
 * Connectivity indicator.
 *
 * Shows a persistent bar while the browser reports no connection, and a brief
 * confirmation when it comes back — so a shopper who lost signal mid-checkout
 * knows exactly when it is safe to try again.
 *
 * The transition is detected by comparing against the previous value *during
 * render* (React's recommended pattern for adjusting state when an input
 * changes) rather than by mirroring connectivity into state from an effect.
 */
const CONFIRMATION_MS = 3500;

export function OfflineBanner() {
  const { t } = useLocale();
  const online = useOnlineStatus();

  const [previousOnline, setPreviousOnline] = useState(online);
  const [confirming, setConfirming] = useState(false);

  if (previousOnline !== online) {
    setPreviousOnline(online);
    // Only a genuine offline -> online transition earns a confirmation.
    setConfirming(online);
  }

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (online && !confirming) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold',
        online ? 'bg-success-500 text-white' : 'bg-ink-900 text-white',
      )}
    >
      {online ? (
        <>
          <CheckIcon className="text-base" />
          {t('offline.backOnline')}
        </>
      ) : (
        <>
          <WifiOffIcon className="text-base" />
          {t('offline.banner')}
        </>
      )}
    </div>
  );
}
