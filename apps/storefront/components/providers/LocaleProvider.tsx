'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@tamizh/core/types';
import type { Dictionary, TranslationKey } from '@/i18n/en';
import { translate } from '@/i18n';
import { LOCALE_COOKIE, LOCALE_TAGS } from '@/i18n/config';

interface LocaleContextValue {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Chooses between an English and a Tamil value from the database. */
  pick: (english: string, tamil: string | null | undefined) => string;
  setLocale: (next: Locale) => void;
  isSwitching: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * The dictionary is resolved on the server and handed down, so the first paint
 * is already in the right language and no translation bundle is fetched on the
 * client. Switching writes a cookie and refreshes the server components.
 */
export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setIsSwitching(true);
      // One year, lax: the choice is a display preference, not a credential.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = LOCALE_TAGS[next];
      router.refresh();
      // The refresh is streamed in; clearing on a microtask keeps the button
      // from flickering when the response is instant.
      setTimeout(() => setIsSwitching(false), 400);
    },
    [locale, router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, vars) => translate(dictionary, key, vars),
      pick: (english, tamil) =>
        locale === 'ta' && tamil && tamil.trim() !== '' ? tamil : english,
      setLocale,
      isSwitching,
    }),
    [locale, dictionary, setLocale, isSwitching],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used inside <LocaleProvider>.');
  }
  return context;
}
