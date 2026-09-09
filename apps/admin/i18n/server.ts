import 'server-only';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale, type Locale } from './config';
import { createTranslator, getDictionary, type Translator } from './index';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** `const { t, locale } = await getI18n()` in any server component. */
export async function getI18n(): Promise<{
  locale: Locale;
  t: Translator;
  dict: ReturnType<typeof getDictionary>;
}> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale), dict: getDictionary(locale) };
}
