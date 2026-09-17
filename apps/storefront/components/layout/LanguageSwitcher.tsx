'use client';

import { useState } from 'react';
import type { Locale } from '@tamizh/core/types';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { GlobeIcon, SpinnerIcon } from '@/components/ui/Icons';

/**
 * Language toggle.
 *
 * Two languages means a segmented control beats a dropdown: one tap, no menu,
 * and both options stay visible so a Tamil reader can find தமிழ் without
 * knowing what the English label says.
 */
export function LanguageSwitcher({
  variant = 'segmented',
  className,
}: {
  variant?: 'segmented' | 'inline';
  className?: string;
}) {
  const { locale, setLocale, t, isSwitching } = useLocale();
  // The language tapped, so the spinner can sit on that option and not on
  // the one being left. Forgotten once the switch has landed.
  const [target, setTarget] = useState<Locale | null>(null);
  const choose = (code: Locale) => {
    setTarget(code);
    setLocale(code);
  };
  const switchingTo = (code: Locale) => isSwitching && target === code;

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <GlobeIcon className="mr-1 text-base text-ink-400" />
        {LOCALES.map((code, index) => (
          <span key={code} className="flex items-center">
            {index > 0 ? (
              // Decorative divider between the two language buttons.
              <span aria-hidden="true" className="px-1.5 text-ink-300">
                /
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => choose(code)}
              disabled={isSwitching}
              aria-current={locale === code ? 'true' : undefined}
              className={cn(
                'inline-flex items-center gap-1 rounded px-1 text-sm transition-colors',
                locale === code
                  ? 'font-bold text-link'
                  : 'text-ink-500 hover:text-ink-800',
                code === 'ta' && 'font-tamil',
              )}
              lang={code}
            >
              {switchingTo(code) ? <SpinnerIcon className="text-sm" /> : null}
              {LOCALE_LABELS[code]}
            </button>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className={cn(
        'inline-flex items-center rounded-full bg-ink-100 p-0.5',
        isSwitching && 'opacity-70',
        className,
      )}
    >
      {LOCALES.map((code: Locale) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => choose(code)}
          disabled={isSwitching}
          aria-pressed={locale === code}
          className={cn(
            'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-all duration-200',
            code === 'ta' && 'font-tamil',
            locale === code
              ? 'bg-surface text-link shadow-sm'
              : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {switchingTo(code) ? <SpinnerIcon className="text-sm" /> : null}
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
