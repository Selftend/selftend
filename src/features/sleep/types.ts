import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

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
}
