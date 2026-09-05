/**
 * The demo seed's rolling window: ~3 months ending today, plus the future-clamp
 * every "today" row goes through. Pure and read off the clock at call time, so
 * a test can fake `Date` and get the exact window the seed would build — the
 * one thing that keeps the band's day-boundary tests from drifting away from
 * the seed they guard (#1971).
 */

/** Days in the seeded window, today included. */
export const DAYS = 89;

// Run early in the day and today's later entries would land in the future,
// tripping the DB's occurrence-time guard ("Occurrence time cannot be in the
// future") and failing the whole seed. Clamp to just-passed instead — today's
// rows bunch up near "now", which only shows when seeding at odd hours and
// only on today's rows. The margin absorbs the clock drift between building a
// row here and the database checking it.
export const FUTURE_MARGIN_MS = 120_000;

/**
 * The window anchored on the machine's clock now. `new Date()` is fine here —
 * the seed runs in plain Node, and the dataset should always end "today".
 */
export function createWindow() {
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  /** The calendar date at day index i (0 = oldest), as a machine-local Date. */
  function dayAt(dayIndex) {
    const d = new Date(end);
    d.setDate(d.getDate() - (DAYS - 1 - dayIndex));
    return d;
  }

  /** An instant that has not happened yet becomes just-passed, as ISO. */
  function clampToPast(millis) {
    return new Date(Math.min(millis, Date.now() - FUTURE_MARGIN_MS)).toISOString();
  }

  return { dayAt, clampToPast };
}
