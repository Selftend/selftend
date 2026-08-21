import i18n from "@/src/i18n";

export interface TimeOfDay {
  hour: number;
  minute: number;
}

/** Which half of the day a 1-12 hour belongs to. */
export type Meridiem = "am" | "pm";

/** Clamp to a valid wall-clock time (hour 0-23, minute 0-59); coerces non-finite to 0. */
export function clampTime({ hour, minute }: TimeOfDay): TimeOfDay {
  const h = Number.isFinite(hour) ? Math.min(Math.max(Math.trunc(hour), 0), 23) : 0;
  const m = Number.isFinite(minute) ? Math.min(Math.max(Math.trunc(minute), 0), 59) : 0;
  return { hour: h, minute: m };
}

/**
 * `{ hour: 7, minute: 5 }` -> `"07:05"` (zero-padded, 24h).
 *
 * ☠️ A WIRE FORMAT, not a display format, and it must never become locale-aware:
 * the meditation onboarding flow writes this string straight into
 * `preferred_time_of_day` in Postgres, so a 12-hour locale would store
 * `"7:05 PM"`. Anything a user READS goes through `formatTimeOfDay` instead.
 */
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

/**
 * True when `lang` writes wall-clock times as 1-12 plus AM/PM.
 *
 * Derived from ICU rather than from a hand-kept list, and from the presence of a
 * `dayPeriod` PART rather than from `resolvedOptions().hourCycle` — the parts are
 * what every engine this app runs on agrees about, including Hermes.
 *
 * This is the single source for the app's 12-vs-24 question: the picker showing
 * `19:53` under text reading `7:53 PM` on the same screen is what it exists to stop.
 */
export function usesTwelveHourClock(lang: string = i18n.language): boolean {
  try {
    const parts = new Intl.DateTimeFormat(lang, { hour: "numeric" }).formatToParts(
      new Date(2000, 0, 1, 13, 0, 0, 0),
    );
    return parts.some((part) => part.type === "dayPeriod");
  } catch {
    // An unparseable tag is a bug elsewhere; 24-hour is the unambiguous reading.
    return false;
  }
}

/**
 * A time as the viewer READS it: `"7:05 PM"` in `en`, `"19:05"` in `bg`.
 *
 * ⚠️ Display only, and deliberately fenced to display call sites — the sibling
 * `formatHHmm` is the wire format and stays 24-hour everywhere.
 */
export function formatTimeOfDay(time: TimeOfDay, lang: string = i18n.language): string {
  const { hour, minute } = clampTime(time);
  try {
    return new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit" }).format(
      timeToDate({ hour, minute }),
    );
  } catch {
    return formatHHmm({ hour, minute });
  }
}

/** A 0-23 hour as a 12-hour clock shows it: `19` -> `{ hour: 7, meridiem: "pm" }`. */
export function toTwelveHour(hour: number): { hour: number; meridiem: Meridiem } {
  const { hour: h } = clampTime({ hour, minute: 0 });
  // Both midnights read as 12: 0 -> 12 AM, 12 -> 12 PM.
  return { hour: h % 12 === 0 ? 12 : h % 12, meridiem: h < 12 ? "am" : "pm" };
}

/** The inverse of `toTwelveHour`: a 1-12 hour plus its meridiem back to 0-23. */
export function fromTwelveHour(hour: number, meridiem: Meridiem): number {
  const base = hour % 12;
  return meridiem === "pm" ? base + 12 : base;
}
