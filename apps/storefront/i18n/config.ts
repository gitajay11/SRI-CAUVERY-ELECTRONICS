import type { Locale } from '@tamizh/core/types';

/**
 * Tamil first: this is a Tamil Nadu shop and the Tamil name is the one over
 * the door. The order here drives the language switcher only.
 *
 * DEFAULT_LOCALE is a separate decision - it is what someone with no saved
 * preference gets - and it stays English, because that is what a first-time
 * visitor arriving from search is most likely to read.
 */
export const LOCALES = ['ta', 'en'] as const;
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
