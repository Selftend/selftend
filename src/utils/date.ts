import i18n from "@/src/i18n";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` for a Date in the viewer's LOCAL timezone. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The LOCAL civil date an ISO timestamp falls on, as `YYYY-MM-DD`. Use this to
 * decide which day an entry belongs to, so it matches the date the user sees.
 */
export function toLocalDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

/** Today's date key in `YYYY-MM-DD`, in the viewer's local timezone. */
export function currentDateKey(): string {
  return localDateKey(new Date());
}

/**
 * The last `count` LOCAL day keys ending on `reference`'s day, oldest first
 * (today last). The shared "last N day keys" helper behind multi-day views
 * like the routines 7-day strip; anchored at local noon so stepping across a
 * DST change can't shift the civil date.
 */
export function lastNDayKeys(count: number, reference: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(reference);
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() - i);
    keys.push(localDateKey(day));
  }
  return keys;
}

/**
 * Parse a `YYYY-MM-DD` key into a Date at LOCAL noon. The `T12:00:00` (no `Z`)
 * suffix avoids DST/midnight rollovers that can shift the civil date by a day.
 */
export function parseLocalNoon(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

// Format with the app's selected language (en/bg), not the device locale - the user
// picks the in-app language independently of the OS. Falls back to the device locale
// if i18n hasn't initialized.
export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(i18n.language || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatLocalTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(i18n.language || undefined);
}

export function calendarDayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function startOfDayDaysAgo(days: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}
