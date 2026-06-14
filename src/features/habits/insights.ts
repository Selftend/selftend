import { addDays, localDateKey } from "@/src/features/habits/scheduling";
import type { Habit, HabitLog } from "@/src/features/habits/types";

export interface WeekdayRhythm {
  /** 0 = Sunday ... 6 = Saturday. Matches Date.prototype.getDay. */
  weekday: number;
  count: number;
}

export interface IdentityRoundUp {
  identity: string;
  count: number;
}

/**
 * Ticks per weekday across the last `weeks` calendar weeks ending at `now`.
 * Always returns seven entries in order [Sun, Mon, ..., Sat].
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

/**
 * Counts ticks contributing to each distinct identity in the current calendar
 * month. Habits with no identity are skipped - identity is the unit, not the
 * habit.
 */
export function getIdentityRoundUp(
  habits: Habit[],
  logs: HabitLog[],
  now: Date = new Date(),
): IdentityRoundUp[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = localDateKey(monthStart);

  const habitIdentity = new Map<string, string>();
  for (const habit of habits) {
    const identity = habit.identity.trim();
    if (identity) habitIdentity.set(habit.id, identity);
  }

  const counts = new Map<string, number>();
  for (const log of logs) {
    if (log.loggedOn < monthStartStr) continue;
    const identity = habitIdentity.get(log.habitId);
    if (!identity) continue;
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([identity, count]) => ({ identity, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Share of active (non-archived) build habits that have filled in a two-minute
 * version. Returns 0 when there are no build habits - a clean empty state.
 */
export function getTwoMinuteAdoption(habits: Habit[]): {
  filled: number;
  total: number;
  ratio: number;
} {
  const active = habits.filter((h) => !h.archivedAt && h.kind === "build");
  const filled = active.filter((h) => h.twoMinuteVersion.trim().length > 0).length;
  const total = active.length;
  const ratio = total === 0 ? 0 : filled / total;
  return { filled, total, ratio };
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [year, month, day] = yyyyMmDd.split("-").map((part) => Number(part));
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}
