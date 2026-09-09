import type { Locale } from '@tamizh/core/types';

export const LOCALES = ['en', 'ta'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie that carries the shopper's language choice across requests. */
export const LOCALE_COOKIE = 'te_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ta: 'தமிழ்',
};

/** BCP-47 tags for `<html lang>` and Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
