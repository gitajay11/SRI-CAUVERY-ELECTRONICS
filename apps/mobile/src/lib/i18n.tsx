import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@tamizh/core/types';
import { createTranslator, type Translator } from '@shop/i18n';
import { LOCALE_LABELS, LOCALE_TAGS, LOCALES } from '@shop/i18n/config';

/**
 * Tamil and English, from the website's own dictionaries so the two never
 * drift. The phone's language decides on first launch — Tamil if the phone is
 * in Tamil, English otherwise, as on the website — and a choice made in the
 * app is remembered from then on.
 */

const LOCALE_KEY = 'prefs.locale';

function deviceLocale(): Locale {
  return getLocales()[0]?.languageCode === 'ta' ? 'ta' : 'en';
}

interface LocaleContextValue {
  locale: Locale;
  /** BCP-47 tag for Intl formatting. */
  tag: string;
  t: Translator;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_KEY)
      .then((saved) => {
        if (saved === 'ta' || saved === 'en') setLocaleState(saved);
      })
      .catch(() => {
        // An unreadable preference just means the phone's language stands.
      });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    SecureStore.setItemAsync(LOCALE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, tag: LOCALE_TAGS[locale], t: createTranslator(locale), setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside <LocaleProvider>.');
  return value;
}

export { LOCALE_LABELS, LOCALES };
