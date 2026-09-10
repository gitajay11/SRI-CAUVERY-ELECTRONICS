'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { DownloadIcon } from '@/components/ui/Icons';
import { useInstall } from './InstallProvider';

/**
 * "Install app", for the desktop utility strip.
 *
 * The drawer already offers this, but the drawer is `lg:hidden` — so on a
 * desktop browser the option did not exist at all. This is the same offer in
 * the one place every desktop visitor can see it, signed in or not.
 *
 * Renders nothing when there is nothing to offer: already installed, or a
 * browser that cannot. An install button that does nothing is worse than no
 * button, because the shopper cannot tell which of the two it is.
 */
export function InstallButton({ className }: { className?: string }) {
  const { t } = useLocale();
  const { canInstall, install } = useInstall();
  const { toast } = useToast();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        const outcome = await install();
        // Safari exposes no install API, so the only honest answer is to say
        // where the button lives.
        if (outcome === 'ios') toast(t('pwa.iosHint'), { tone: 'info' });
      }}
      className={className}
    >
      <DownloadIcon className="text-sm text-gold-300" />
      {t('pwa.installApp')}
    </button>
  );
}
