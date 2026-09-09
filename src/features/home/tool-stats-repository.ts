import type { ToolKey } from "@/src/features/favorites/items";
import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";

/**
 * Every Home tool card's figures, in one round trip (#2212).
 *
 * `home_tool_stats(p_time_zone, p_day, p_grounding_names)` returns one row per tool
 * key with that tool's stats as a jsonb object. The figures are the ones each tool's
 * own header renders - the function calls the tool's own aggregate where one exists
 * (`sleep_stats`, `journal_word_total`, `meditation_median_minutes`,
 * `breathing_total_minutes`) and restates only the head counts - and every average
 * and the median come back EXACT and unrounded, so the rounding stays here and
 * cannot drift from the per-tool hooks on a `.5` tie (ADR-0001).
 *
 * Every field below is exactly what the per-tool hook it replaces used to hold, so
 * `tool-row-stats.tsx` can compose the same line from it.
 */
export interface MoodToolStats {
  lifetimeCount: number;
  /** Check-ins in the current Monday-start calendar week (#697). */
  thisWeekCount: number;
  /** Trailing 7-day mean score, unrounded; null with no check-in in the window. */
  avg7: number | null;
}

export interface JournalToolStats {
  entries: number;
  words: number;
}

export interface GratitudeToolStats {
  entries: number;
  /** Entries since Monday, by the civil day captured with each. */
  thisWeek: number;
}

export interface BreathingToolStats {
  sessions: number;
  minutes: number;
}

export interface GroundingToolStats {
  sessions: number;
  /** The newest session's instant, or null with no sessions. */
  lastCompletedAt: string | null;
  lastCompletedOffsetMinutes: CapturedOffsetMinutes;
}

export interface MeditationToolStats {
  sits: number;
  /** Lifetime median sit length, unrounded; null with no sits. */
  medianMinutes: number | null;
}

export interface SleepToolStats {
  /** `sleep_stats.avg_duration_minutes_7`, unrounded; null with no nights. */
  avgDurationMinutes7: number | null;
  /** `sleep_stats.avg_quality_7`, unrounded; null with no nights. */
  avgQuality7: number | null;
}

export interface HabitsToolStats {
  /** Unarchived habits. */
  active: number;
  /** Of those, the ones scheduled on the day asked for. */
  dueToday: number;
  /** Of those, the ones ticked on that day. */
  doneToday: number;
}

export interface HomeToolStats {
  mood: MoodToolStats;
  journal: JournalToolStats;
  gratitude: GratitudeToolStats;
  breathing: BreathingToolStats;
  grounding: GroundingToolStats;
  meditation: MeditationToolStats;
  sleep: SleepToolStats;
  habits: HabitsToolStats;
}

export interface HomeToolStatsArgs {
  /** The viewer's IANA zone - the fallback frame for rows that captured no offset. */
  timeZone: string;
  /** The viewer's civil day, `YYYY-MM-DD` - the day Home describes. */
  dayKey: string;
  /** The grounding slugs, so the breathing/grounding split lives on the client. */
  groundingNames: readonly string[];
}

interface HomeToolStatsRow {
  tool_key: string;
  stats: Record<string, unknown> | null;
}

type Stats = Record<string, unknown>;

/**
 * A malformed row throws rather than reading as zero: the query then errors and
 * `data` stays `undefined`, which the card renders as NOTHING - a loading surface
 * never claims emptiness, and "0 entries" over a broken payload would erase a real
 * history. `numeric`/`bigint` inside jsonb arrive as JSON numbers, but a string is
 * accepted too in case a driver ever serialises them the way PostgREST columns do.
 */
function count(stats: Stats, field: string): number {
  const value = stats[field];
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new Error(`home_tool_stats: ${field} is not a number`);
  }
  return n;
}

function nullableNumber(stats: Stats, field: string): number | null {
  const value = stats[field];
  if (value === null || value === undefined) return null;
  return count(stats, field);
}

function nullableString(stats: Stats, field: string): string | null {
  const value = stats[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`home_tool_stats: ${field} is not a string`);
  return value;
}

const PARSERS: { [K in ToolKey]: (stats: Stats) => HomeToolStats[K] } = {
  mood: (s) => ({
    lifetimeCount: count(s, "lifetimeCount"),
    thisWeekCount: count(s, "thisWeekCount"),
    avg7: nullableNumber(s, "avg7"),
  }),
  journal: (s) => ({ entries: count(s, "entries"), words: count(s, "words") }),
  gratitude: (s) => ({ entries: count(s, "entries"), thisWeek: count(s, "thisWeek") }),
  breathing: (s) => ({ sessions: count(s, "sessions"), minutes: count(s, "minutes") }),
  grounding: (s) => ({
    sessions: count(s, "sessions"),
    lastCompletedAt: nullableString(s, "lastCompletedAt"),
    lastCompletedOffsetMinutes: nullableNumber(s, "lastCompletedOffsetMinutes"),
  }),
  meditation: (s) => ({
    sits: count(s, "sits"),
    medianMinutes: nullableNumber(s, "medianMinutes"),
  }),
  sleep: (s) => ({
    avgDurationMinutes7: nullableNumber(s, "avgDurationMinutes7"),
    avgQuality7: nullableNumber(s, "avgQuality7"),
  }),
  habits: (s) => ({
    active: count(s, "active"),
    dueToday: count(s, "dueToday"),
    doneToday: count(s, "doneToday"),
  }),
};

const TOOL_KEYS = Object.keys(PARSERS) as ToolKey[];

/**
 * Turns the RPC's rows into one object keyed by tool. A row whose key is not a tool
 * is ignored (a later migration may add one before the client learns it); a tool
 * with NO row is an error, for the reason `count` gives - the card would otherwise
 * have nothing honest to draw.
 */
export function parseHomeToolStats(rows: readonly HomeToolStatsRow[]): HomeToolStats {
  const byKey = new Map<string, Stats>();
  for (const row of rows) {
    if (row.stats && typeof row.stats === "object") byKey.set(row.tool_key, row.stats);
  }
  const parsed: Partial<HomeToolStats> = {};
  for (const key of TOOL_KEYS) {
    const stats = byKey.get(key);
    if (!stats) throw new Error(`home_tool_stats: no row for ${key}`);
    // The parser table is keyed by the same union, so each slot gets its own shape.
    (parsed as Record<ToolKey, unknown>)[key] = PARSERS[key](stats);
  }
  return parsed as HomeToolStats;
}

/**
 * One RPC for all eight cards. No user id: the function scopes itself to `auth.uid()`
 * under the caller's own RLS, like every other aggregate here.
 */
export async function fetchHomeToolStats(args: HomeToolStatsArgs): Promise<HomeToolStats> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("home_tool_stats", {
    p_time_zone: args.timeZone,
    p_day: args.dayKey,
    p_grounding_names: [...args.groundingNames],
  });
  if (error) throw error;
  return parseHomeToolStats((data ?? []) as HomeToolStatsRow[]);
}
