import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

/**
 * The optional estimated bounds of one sleep period (#800). Both bounds and
 * both captured offsets travel together — one-sided windows are invalid — and
 * the whole payload is encrypted at rest as a single ciphertext. The two
 * offsets are distinct because a sleep may cross a DST transition or, less
 * commonly, a timezone boundary: elapsed duration comes from the instants,
 * displayed local times from their respective captured frames.
 */
export interface SleepWindow {
  startedAt: string;
  startedOffsetMinutes: number;
  endedAt: string;
  endedOffsetMinutes: number;
}

export interface SleepLog {
  id: string;
  userId: string;
  durationMinutes: number;
  quality: number;
  notes: string;
  loggedAt: string;
  loggedOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day this entry belongs to (`YYYY-MM-DD`), resolved once in the
   * repository. Day-scoped surfaces group on this and never convert the
   * timestamp themselves — see the lint guard in eslint.config.js (#250).
   */
  dayKey: string;
  /**
   * Estimated sleep bounds, or null for a duration-only entry. An entry is in
   * exactly one of the two modes; windowed entries have their duration derived
   * from these bounds by the database write path.
   */
  window: SleepWindow | null;
  createdAt: string;
}

/**
 * The tracker's summary figures, aggregated over the user's whole history rather
 * than the capped list query the screen loads (#256). Every field is already
 * rounded the way the client-side `summaries.ts` helpers rounded it, so the two
 * sources are interchangeable while the query is in flight.
 *
 * A `null` average means "no nights in that window", which is not zero — the
 * screen renders the shared "-" placeholder for it.
 */
export interface SleepStats {
  sevenDayDurationMinutes: number | null;
  sevenDayQuality: number | null;
  thirtyDayDurationMinutes: number | null;
  thirtyDayQuality: number | null;
  /** Counts for quality 1..5 over the last 30 captured days; always five long. */
  qualityDistribution30: number[];
  longestMinutes: number | null;
  shortestMinutes: number | null;
  /** Monday..Sunday average duration; always seven long, null where no nights. */
  weekdayAverageMinutes: (number | null)[];
}

export interface SleepInput {
  durationMinutes: number;
  quality: number;
  notes: string;
  loggedAt?: string;
  /** Null preserves "not captured" on an edit; see the editor's offset handling. */
  loggedOffsetMinutes?: CapturedOffsetMinutes;
  /**
   * The entry's sleep window. `null` explicitly deletes any stored window
   * (switching to duration-only removes the ciphertext rather than retaining
   * hidden exact times); `undefined` means the caller has no opinion and leaves
   * whatever is stored untouched.
   */
  window?: SleepWindow | null;
}
