import type { HabitLog } from "@/src/features/habits/types";
import { localDateKey, parseLocalNoon } from "@/src/utils/date";

/**
 * The twelve-week tick grid on habit detail (#761, decided on #713).
 *
 * Twelve rather than the design's eight: twelve fits at 360dp with room to
 * spare, so eight was a desktop choice - and a shorter window makes a rough
 * patch loom LARGER, since a two-week gap is 17% of twelve weeks and 25% of
 * eight. The guardrail says not to amplify a missed stretch, so the longer
 * window is the kinder one.
 */
export const TICK_GRID_WEEKS = 12;

/** One slot. Every slot has a day; a future one is drawn as nothing. */
export interface TickGridDay {
  /** `YYYY-MM-DD` - the React key, and the day a tick writes to. */
  key: string;
  /** Local noon on that day, for formatting the cell's accessible name. */
  date: Date;
  /** True once the day is past today. Future days render as an empty slot. */
  isFuture: boolean;
}

/** One column: seven consecutive days, Monday first. */
export interface TickGridWeek {
  /** The Monday that opens the column. */
  key: string;
  days: TickGridDay[];
}

/**
 * The Monday of `dayKey`'s week, at local noon.
 *
 * Monday-first matches `mondayKeyOf` on the check-in map and matches `bg`
 * convention. Only the DISPLAY order changes - the `insights.weekday.*` and
 * `form.weekday.*` keys stay indexed by `Date.getDay()` (0 = Sunday).
 */
export function mondayNoonOf(dayKey: string): Date {
  const date = parseLocalNoon(dayKey);
  const dow = date.getDay();
  date.setDate(date.getDate() + (dow === 0 ? -6 : 1 - dow));
  return date;
}

/**
 * The first day the grid draws - and the `sinceDate` its logs query needs.
 *
 * Anchored on a Monday rather than on "84 days ago", which is what makes the
 * row index actually BE the weekday. Without that the grid only reads as a
 * calendar when the window happens to open on a Monday, and the whole structure
 * is decorative.
 */
export function tickGridStartKey(todayKey: string, weeks: number = TICK_GRID_WEEKS): string {
  const monday = mondayNoonOf(todayKey);
  monday.setDate(monday.getDate() - (weeks - 1) * 7);
  return localDateKey(monday);
}

/**
 * Weeks as columns, weekdays as rows.
 *
 * Returned column-major on purpose: the caller renders one `View` per week, so
 * DOM order stays chronological and a screen reader walks Monday-to-Sunday of
 * one week before moving to the next. Row-major would announce every Monday for
 * twelve weeks, then every Tuesday.
 *
 * Anchored at local noon throughout, so stepping a day across a DST boundary
 * cannot shift the civil date.
 */
export function buildTickGrid(todayKey: string, weeks: number = TICK_GRID_WEEKS): TickGridWeek[] {
  const cursor = parseLocalNoon(tickGridStartKey(todayKey, weeks));
  const grid: TickGridWeek[] = [];
  for (let week = 0; week < weeks; week += 1) {
    const days: TickGridDay[] = [];
    for (let row = 0; row < 7; row += 1) {
      const date = new Date(cursor);
      const key = localDateKey(date);
      // `YYYY-MM-DD` compares lexicographically, so this is a real date test.
      days.push({ key, date, isFuture: key > todayKey });
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push({ key: days[0].key, days });
  }
  return grid;
}

/**
 * How many ticks the drawn window holds. A bare count, never a ratio (#713).
 *
 * A denominator encodes what the user should have done, and for a `weekdays`
 * habit `56` counts sixteen days it was never due. "Correcting" it to 40 is
 * worse - that turns a calendar into a compliance score, and 38/40 is a grade.
 */
export function countTicksInWindow(
  logs: HabitLog[],
  habitId: string,
  startKey: string,
  endKey: string,
): number {
  return logs.filter(
    (log) => log.habitId === habitId && log.loggedOn >= startKey && log.loggedOn <= endKey,
  ).length;
}
