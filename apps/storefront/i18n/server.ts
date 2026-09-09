import 'server-only';
import { cookies } from 'next/headers';
import type { Locale } from '@tamizh/core/types';
import { LOCALE_COOKIE, normalizeLocale } from './config';
import { createTranslator, getDictionary, type Translator } from './index';

/** Reads the shopper's language from the locale cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Convenience for server components: `const { t, locale } = await getI18n()`. */
export async function getI18n(): Promise<{
  locale: Locale;
  t: Translator;
  dict: ReturnType<typeof getDictionary>;
}> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale), dict: getDictionary(locale) };
}
