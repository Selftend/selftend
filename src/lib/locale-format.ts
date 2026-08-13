import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface LocaleFormats {
  formatDate: (value: string | number | Date) => string;
  formatDateTime: (value: string | number | Date) => string;
  /** One-decimal number, e.g. `3.0` in en and `3,0` in bg. */
  formatOneDecimal: (value: number) => string;
}

// One-decimal formatters are the same per-language cache problem as the date ones.
const decimalCache = new Map<string, Intl.NumberFormat>();

function oneDecimalFormat(lang: string): Intl.NumberFormat {
  const cached = decimalCache.get(lang);
  if (cached) return cached;
  // min = max = 1 keeps the trailing zero the old `toFixed(1)` sites printed, so a
  // 7-day average reads "3,0" and not "3" once the decimal point becomes a comma.
  const format = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  decimalCache.set(lang, format);
  return format;
}

/**
 * One-decimal number in `lang`'s convention. Pure, so non-component code (the Android
 * widget snapshot builder) can reach it without a hook.
 */
export function formatOneDecimal(value: number, lang: string): string {
  return oneDecimalFormat(lang).format(value);
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
    formatOneDecimal: (value) => formatOneDecimal(value, lang),
  };
  cache.set(lang, formats);
  return formats;
}

/** Locale-aware date formatters bound to the active app language. */
export function useLocaleFormats(): LocaleFormats {
  const { i18n } = useTranslation();
  return useMemo(() => makeLocaleFormats(i18n.language), [i18n.language]);
}
