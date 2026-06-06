export interface TimeOfDay {
  hour: number;
  minute: number;
}

/** Clamp to a valid wall-clock time (hour 0–23, minute 0–59); coerces non-finite to 0. */
export function clampTime({ hour, minute }: TimeOfDay): TimeOfDay {
  const h = Number.isFinite(hour) ? Math.min(Math.max(Math.trunc(hour), 0), 23) : 0;
  const m = Number.isFinite(minute) ? Math.min(Math.max(Math.trunc(minute), 0), 59) : 0;
  return { hour: h, minute: m };
}

/** `{ hour: 7, minute: 5 }` -> `"07:05"` (zero-padded, 24h). */
export function formatHHmm(time: TimeOfDay): string {
  const { hour, minute } = clampTime(time);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** `"07:05"` -> `{ hour: 7, minute: 5 }`; `null` for empty/malformed/out-of-range. */
export function parseHHmm(value: string | null | undefined): TimeOfDay | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** A concrete Date on a fixed day carrying the given wall-clock time (for OS pickers). */
export function timeToDate(time: TimeOfDay): Date {
  const { hour, minute } = clampTime(time);
  return new Date(2000, 0, 1, hour, minute, 0, 0);
}

/** Wall-clock `{ hour, minute }` from a Date. */
export function dateToTime(date: Date): TimeOfDay {
  return { hour: date.getHours(), minute: date.getMinutes() };
}

/** True when the locale formats time on a 24-hour clock (no AM/PM). */
export function is24HourLocale(locale: string): boolean {
  try {
    const formatted = new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(
      timeToDate({ hour: 13, minute: 0 }),
    );
    // 24h locales render "13"; 12h locales render "1 PM" (no "13").
    return formatted.includes("13");
  } catch {
    return false;
  }
}

/** Localized short time, e.g. `"7:05 AM"` (en) or `"7:05"` (bg). */
export function formatTimeLabel(time: TimeOfDay, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(timeToDate(time));
  } catch {
    return formatHHmm(time);
  }
}
