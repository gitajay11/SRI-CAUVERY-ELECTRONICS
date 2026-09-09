/**
 * Theme preference, shared by both applications.
 *
 * Three states, not two. "system" is the default and is the *absence* of a
 * choice — it stamps nothing on the document, so `prefers-color-scheme` decides.
 * Only an explicit "light" or "dark" writes `data-theme`, which is what lets a
 * deliberate light choice beat a dark operating system.
 *
 * The preference lives in a cookie rather than localStorage so the server can
 * read it while rendering and stamp the root element in the same pass. That is
 * what avoids the flash of the wrong theme: there is no moment where the page
 * has painted but the script has not run, because there is no script.
 */

export const THEME_COOKIE = 'te_theme';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'system';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function normalizeTheme(value: string | undefined | null): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

/**
 * What to put in `data-theme`.
 *
 * `undefined` for "system" — the attribute must be absent, not empty, or the
 * `:root:not([data-theme='light'])` guard in the stylesheet stops working.
 */
export function themeAttribute(theme: Theme): 'light' | 'dark' | undefined {
  return theme === 'system' ? undefined : theme;
}

/** Labels for the theme control, in both languages. */
export const THEME_LABELS: Record<Theme, { en: string; ta: string }> = {
  system: { en: 'System', ta: 'கணினி' },
  light: { en: 'Light', ta: 'ஒளி' },
  dark: { en: 'Dark', ta: 'இருள்' },
};
