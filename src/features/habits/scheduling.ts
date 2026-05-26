import type { Habit, HabitLog } from "@/src/features/habits/types";

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + delta);
  return next;
}

export function isScheduledOn(habit: Habit, date: Date): boolean {
  if (habit.archivedAt) return false;
  if (habit.cadence === "daily") return true;
  const dow = date.getDay();
  if (habit.cadence === "weekdays") return dow >= 1 && dow <= 5;
  return habit.customDays.includes(dow);
}

export function isTickedOn(logs: HabitLog[], habitId: string, dateStr: string): boolean {
  return logs.some((log) => log.habitId === habitId && log.loggedOn === dateStr);
}

export function lastSevenDays(reference: Date = new Date()): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    days.push(addDays(reference, -i));
  }
  return days;
}

/**
 * Returns true when the habit was scheduled yesterday, not ticked yesterday,
 * not ticked today, and was scheduled today. Surfaces the quiet "Never Miss
 * Twice" prompt without ever turning into shame copy.
 */
export function isAtMissTwiceRisk(habit: Habit, logs: HabitLog[], now: Date = new Date()): boolean {
  const yesterday = addDays(now, -1);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (!isScheduledOn(habit, yesterday)) return false;
  if (!isScheduledOn(habit, today)) return false;

  const yesterdayStr = toLocalDateString(yesterday);
  const todayStr = toLocalDateString(today);

  // A habit can't have been "missed" before it existed — a habit created today
  // hasn't skipped yesterday.
  if (toLocalDateString(new Date(habit.createdAt)) > yesterdayStr) return false;

  if (isTickedOn(logs, habit.id, yesterdayStr)) return false;
  if (isTickedOn(logs, habit.id, todayStr)) return false;
  return true;
}
