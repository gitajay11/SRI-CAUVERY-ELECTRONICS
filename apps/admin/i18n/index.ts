import { en, type Dictionary, type TranslationKey } from './en';
import { ta } from './ta';
import { DEFAULT_LOCALE, type Locale } from './config';

export type { Dictionary, TranslationKey };
export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

const dictionaries: Record<Locale, Dictionary> = { en, ta };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/**
 * Fills {placeholders}. A missing key falls back to English and then to the
 * key itself, so a gap is visible rather than rendering as blank space.
 */
export function translate(
  dict: Dictionary,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function createTranslator(locale: Locale): Translator {
  const dict = getDictionary(locale);
  return (key, vars) => translate(dict, key, vars);
}
