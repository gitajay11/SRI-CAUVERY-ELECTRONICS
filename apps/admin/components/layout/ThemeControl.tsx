'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE, THEMES, type Theme } from '@tamizh/core/theme';
import { cn } from '@tamizh/core/utils';
import { MoonIcon, SunIcon, SystemIcon } from '@/components/ui/Icons';

/**
 * Light / dark / system, as a segmented control.
 *
 * Three options rather than a two-way switch, because "follow my device" is a
 * real preference and a toggle cannot express it — a phone that turns dark at
 * sunset should take the panel with it unless the staff member has said
 * otherwise.
 *
 * The choice is applied to the document immediately and the cookie is written
 * for the next server render, so the panel re-colours on the click rather than
 * on a round trip. `router.refresh()` is deliberately not called: nothing on
 * the server depends on the theme except the attribute already set here.
 *
 * The current value arrives as a prop rather than being read off `document`
 * in an effect. The server has already read the cookie — it had to, to stamp
 * the root element — so passing it down means the control is drawn in the
 * right position by the first paint instead of correcting itself after it.
 *
 * Segmented rather than a menu so it can sit inside the account menu next to
 * the language control and read as the same kind of setting — and so the
 * current choice is visible without opening anything.
 */

const ICONS: Record<Theme, typeof SunIcon> = {
  system: SystemIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export function ThemeControl({
  current,
  label,
  labels,
  className,
}: {
  /** What the server stamped on the document for this request. */
  current: Theme;
  /** Passed in, because the sign-in screen renders before a locale provider. */
  label: string;
  labels: Record<Theme, string>;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>(current);

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

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}
    >
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        const active = option === theme;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option)}
            className={cn(
              'flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-surface text-link shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <Icon className="text-sm" />
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
