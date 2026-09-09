'use client';

import type { Locale } from '@tamizh/core/types';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { GlobeIcon } from '@/components/ui/Icons';

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
              onClick={() => setLocale(code)}
              aria-current={locale === code ? 'true' : undefined}
              className={cn(
                'rounded px-1 text-sm transition-colors',
                locale === code
                  ? 'font-bold text-brand-700'
                  : 'text-ink-500 hover:text-ink-800',
                code === 'ta' && 'font-tamil',
              )}
              lang={code}
            >
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
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            'min-h-8 rounded-full px-3 text-sm font-semibold transition-all duration-200',
            code === 'ta' && 'font-tamil',
            locale === code
              ? 'bg-surface text-brand-700 shadow-sm'
              : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
