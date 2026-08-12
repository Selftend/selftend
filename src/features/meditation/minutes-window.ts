import { dayRangeEndKey, lastNDayKeysEndingAt, startOfDayDaysAgo } from "@/src/utils/date";

/** The thirty columns the overview's "Minutes sat" chart draws (#785). */
export const MINUTES_WINDOW_DAYS = 30;

export interface MinutesDay {
  dayKey: string;
  /** Total minutes sat that civil day. Zero for a day with no sit. */
  minutes: number;
}

/** The shape the window needs off a sit - the full session row is far more than this. */
export interface SatMinutes {
  dayKey: string;
  durationMinutes: number;
}

/**
 * The lower bound to fetch the window from, as an instant.
 *
 * Padded by one day on purpose, and it is the same padding `listMoodScorePoints`
 * pays for the same reason: the query bounds `completed_at`, a UTC instant, while
 * the chart buckets by the civil day CAPTURED with the sit (`dayKey`). A sit
 * logged at +14:00 belongs to a day key up to 14h before its own UTC instant, so
 * a bound placed exactly on the window's first local midnight would drop it.
 * Rows outside the window still get filtered out below, by day key.
 */
export function minutesWindowFromIso(days = MINUTES_WINDOW_DAYS, now: Date = new Date()): string {
  return startOfDayDaysAgo(days + 1, now).toISOString();
}

/**
 * Thirty consecutive days of minutes sat, oldest first, every day present.
 *
 * Days with no sit are `0` rather than absent, because the chart draws a stub for
 * them: a gap and a zero are different facts, and only one of them is "you did
 * not sit that day". Two sits on one day sum - the column is the day's minutes,
 * not a sit.
 *
 * The window ends at `dayRangeEndKey`, not at today: fly east-to-west and you
 * land holding a sit keyed "tomorrow", and a window clamped to the viewer's
 * current day would drop it off the right-hand edge of the chart (#250).
 */
export function buildMinutesWindow(
  sessions: readonly SatMinutes[] | undefined,
  days = MINUTES_WINDOW_DAYS,
  now: Date = new Date(),
): MinutesDay[] {
  const rows = sessions ?? [];
  const endKey = dayRangeEndKey(
    rows.map((row) => row.dayKey),
    now,
  );
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.dayKey, (totals.get(row.dayKey) ?? 0) + row.durationMinutes);
  }
  return lastNDayKeysEndingAt(days, endKey).map((dayKey) => ({
    dayKey,
    minutes: totals.get(dayKey) ?? 0,
  }));
}

/** Total minutes across the window - the number the chart's text equivalent states. */
export function windowTotalMinutes(window: readonly MinutesDay[]): number {
  return window.reduce((sum, day) => sum + day.minutes, 0);
}
