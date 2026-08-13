import { formatOneDecimal } from "@/src/lib/locale-format";

/**
 * The narrow slice of i18next's `t` these formatters need. Any namespace-bound `t` satisfies
 * it, because the unit keys are addressed with an explicit `common:` prefix.
 */
type TranslateUnits = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Whole-minute duration, e.g. `7h 30m` / `7 ч 30 мин`. Unit spelling, spacing and order all
 * live in the `common:units.*` templates, so English stays compact while Bulgarian gets the
 * space its convention requires.
 */
export function formatDuration(minutes: number, t: TranslateUnits): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0
    ? t("common:units.durationH", { hours: h })
    : t("common:units.durationHm", { hours: h, minutes: m });
}

/** Locale-aware decimal value for dense chart labels; the caller supplies the translated unit. */
export function formatCompactHours(minutes: number, locale: string): string {
  const hours = minutes / 60;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours);
}

// One-decimal hours for averages, with the shared "-" placeholder for no data.
export function formatHours(minutes: number | null, locale: string, t: TranslateUnits): string {
  if (minutes === null) return "-";
  return t("common:units.decimalHours", { value: formatOneDecimal(minutes / 60, locale) });
}
