import { addDays, localDateKey } from "@/src/features/habits/scheduling";
import type { HabitLog } from "@/src/features/habits/types";

export interface WeekdayRhythm {
  /** 0 = Sunday ... 6 = Saturday. Matches Date.prototype.getDay. */
  weekday: number;
  count: number;
}

/**
 * Ticks per weekday across the last `weeks` calendar weeks ending at `now`.
 * Always returns seven entries in order [Sun, Mon, ..., Sat].
 *
 * The only insight habits ships (#763). Two others were retired here rather
 * than redesigned: two-minute adoption was a completeness meter for an
 * *optional* form field, and the identity round-up ranked someone's own
 * self-descriptions against each other - and blanked for every user on the 1st
 * of the month, because it counted the current calendar month only.
 */
export function getWeeklyRhythm(
  logs: HabitLog[],
  weeks: number,
  now: Date = new Date(),
): WeekdayRhythm[] {
  const start = addDays(now, -(weeks * 7) + 1);
  const startStr = localDateKey(start);

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const log of logs) {
    if (log.loggedOn < startStr) continue;
    const date = parseLocalDate(log.loggedOn);
    counts[date.getDay()] += 1;
  }

  return counts.map((count, weekday) => ({ weekday, count }));
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [year, month, day] = yyyyMmDd.split("-").map((part) => Number(part));
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}
