'use client';

import { useEffect, useRef, useState } from 'react';
import { THEME_COOKIE, THEMES, type Theme } from '@tamizh/core/theme';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { MoonIcon, SunIcon, SystemIcon } from '@/components/ui/Icons';

/**
 * Light / dark / system.
 *
 * The change is applied to the document immediately and the cookie is written
 * for the next server render, so the page re-colours on the click rather than
 * on a round trip. `router.refresh()` is deliberately not called: nothing on
 * the server depends on the theme except the attribute we have already set.
 *
 * The current value arrives as a prop rather than being read off `document`
 * in an effect: the server read the cookie to stamp the root element, so
 * passing it down means the control is drawn in the right position by the
 * first paint instead of correcting itself after hydration.
 *
 * Three options rather than a two-way switch, because "follow my system" is a
 * real preference and a toggle cannot express it — a phone that turns dark at
 * sunset should take the shop with it unless the shopper has said otherwise.
 */

const ICONS: Record<Theme, typeof SunIcon> = {
  system: SystemIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export function ThemeToggle({
  current,
  className,
}: {
  /** What the server stamped on the document for this request. */
  current: Theme;
  className?: string;
}) {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>(current);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);


  // Applying the choice is a synchronisation with something outside React —
  // the document element and a cookie — so it belongs in an effect rather than
  // in the click handler. It commits in the same paint as the state change, so
  // the interface still re-colours on the click and not a frame later.
  //
  // Running on mount too is deliberate: it re-writes the value the server
  // already stamped (a no-op) and refreshes the cookie's expiry, so a
  // preference stays set for someone who visits regularly.
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;

    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    setOpen(false);
  };

  const Current = ICONS[theme];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('theme.label')}
        className="grid size-10 place-items-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        <Current className="text-lg" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-ink-200 bg-surface p-1 shadow-card"
        >
          {THEMES.map((option) => {
            const Icon = ICONS[option];
            const active = option === theme;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(option)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-success-100 font-semibold text-link'
                    : 'text-ink-700 hover:bg-ink-100',
                )}
              >
                <Icon className="text-base" />
                {t(`theme.${option}` as 'theme.system')}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
