import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface LocaleFormats {
  formatDate: (value: string | number | Date) => string;
  formatDateTime: (value: string | number | Date) => string;
}

// Formatter construction is expensive; cache per language (2 languages today).
const cache = new Map<string, LocaleFormats>();

export function makeLocaleFormats(lang: string): LocaleFormats {
  const cached = cache.get(lang);
  if (cached) return cached;
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });
  const dateTime = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  const formats: LocaleFormats = {
    formatDate: (value) => date.format(new Date(value)),
    formatDateTime: (value) => dateTime.format(new Date(value)),
  };
  cache.set(lang, formats);
  return formats;
}

/** Locale-aware date formatters bound to the active app language. */
export function useLocaleFormats(): LocaleFormats {
  const { i18n } = useTranslation();
  return useMemo(() => makeLocaleFormats(i18n.language), [i18n.language]);
}
