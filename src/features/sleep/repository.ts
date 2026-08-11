import type { SleepInput, SleepLog, SleepStats, SleepWindow } from "@/src/features/sleep/types";
import { sleepWindowSchema } from "@/src/features/sleep/schemas";
import { descendingDayCursorFilter, type DayRecordCursor } from "@/src/lib/descending-cursor";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";
import { roundTo1 } from "@/src/utils/number";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface SleepLogRow {
  id: string;
  user_id: string;
  duration_minutes: number;
  quality: number;
  notes: string;
  logged_at: string;
  logged_offset_minutes?: number | null;
  sleep_window?: string | null;
  entry_day?: string | null;
  created_at: string;
}

// The view serves the decrypted window as one JSON text column (one decrypt per
// row, #706). Parse defensively: this runs over whole lists mid-render, so a
// malformed payload degrades to "no window" rather than blanking a screen.
function parseSleepWindow(raw: string | null | undefined): SleepWindow | null {
  if (!raw) return null;
  try {
    const parsed = sleepWindowSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function mapSleepLog(row: SleepLogRow): SleepLog {
  const loggedOffsetMinutes = row.logged_offset_minutes ?? null;
  const window = parseSleepWindow(row.sleep_window);
  return {
    id: row.id,
    userId: row.user_id,
    durationMinutes: row.duration_minutes,
    quality: row.quality,
    notes: row.notes,
    loggedAt: row.logged_at,
    loggedOffsetMinutes,
    // A windowed entry belongs to the civil day at sleep start, in the frame
    // captured at that bound (#800); the rest keep the captured-day calculation.
    dayKey: window
      ? entryDayKey(window.startedAt, window.startedOffsetMinutes)
      : entryDayKey(row.logged_at, loggedOffsetMinutes),
    // The SERVER's derived calendar key, verbatim: paging cursors must speak the
    // ordering column's own values, not a client recomputation that can disagree
    // for legacy never-captured-offset rows.
    entryDay: row.entry_day ?? entryDayKey(row.logged_at, loggedOffsetMinutes),
    window,
    createdAt: row.created_at,
  };
}

export async function listSleepLogs(userId: string, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as SleepLogRow[]).map(mapSleepLog);
}

/**
 * The unbounded history, one page at a time — sleep adopts check-in's paging
 * (#696, decided for sleep on #775). Ordered by the server-derived entry day,
 * then creation time, then id (#800; the matching index shipped with
 * 20260811000000), so a windowed entry files under the day it belongs to and
 * inserts or deletes above the cursor boundary cannot shift later pages.
 */
export async function listSleepLogsPage(
  userId: string,
  limit: number,
  cursor: DayRecordCursor | null,
) {
  const client = requireSupabase();
  let query = client
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .order("entry_day", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) query = query.or(descendingDayCursorFilter("entry_day", "created_at", cursor));

  const { data, error } = await query
    .limit(limit)
    // PostgREST retries idempotent reads internally; the app's query client
    // already owns retry policy, and both together mean ~17s of blank UI.
    .retry(false);

  if (error) throw error;
  return (data as SleepLogRow[]).map(mapSleepLog);
}

// Exact lifetime count for hero stats - independent of the capped list query, which
// would otherwise freeze the displayed total at `limit`.
export async function countSleepLogs(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("sleep_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

interface SleepStatsRow {
  avg_duration_minutes_7: number | string | null;
  avg_quality_7: number | string | null;
  avg_duration_minutes_30: number | string | null;
  avg_quality_30: number | string | null;
  quality_counts_30: (number | string | null)[] | null;
  longest_minutes: number | string | null;
  shortest_minutes: number | string | null;
  weekday_avg_minutes: (number | string | null)[] | null;
}

// `numeric` crosses the wire as a string often enough to be worth normalising once.
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number | string | null | undefined): number | null {
  const n = toNumber(value);
  return n === null ? null : Math.round(n);
}

// Exact summary stats for the tracker. Computing them on the device only ever covered the
// 50 logs the list query loads, so the lifetime figures (longest, shortest, the weekday
// averages) truncated the moment a user passed 50 nights, and the 7- and 30-day windows
// truncated as soon as more than 50 logs fell inside them (#256).
//
// The RPC scopes itself to auth.uid() under the caller's own RLS, so it takes no user id.
// It does take the viewer's time zone: sleep is bucketed by the civil day captured with
// each log (#250), and the server needs the viewer's frame both to resolve rows whose
// offset was never captured and to know which day "today" is when closing the window -
// exactly the two things `entryDayKey` and `dayRangeEndKey` use the device for.
//
// Rounding lives here rather than in SQL so these values match what `summaries.ts`
// produced for the same data: `Math.round` breaks a `.5` tie upward, while Postgres
// `round()` breaks it to even for `double precision` and away from zero for `numeric`.
export async function sleepStats(timeZone: string): Promise<SleepStats | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("sleep_stats", { p_time_zone: timeZone })
    .maybeSingle<SleepStatsRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    sevenDayDurationMinutes: round(data.avg_duration_minutes_7),
    sevenDayQuality: roundTo1Or(data.avg_quality_7),
    thirtyDayDurationMinutes: round(data.avg_duration_minutes_30),
    thirtyDayQuality: roundTo1Or(data.avg_quality_30),
    // Defensive lengths: the function always returns dense arrays, but a summary that
    // silently renders four quality bars would be worse than one that renders five zeros.
    qualityDistribution30: fixedLength(data.quality_counts_30, 5).map((v) => toNumber(v) ?? 0),
    longestMinutes: toNumber(data.longest_minutes),
    shortestMinutes: toNumber(data.shortest_minutes),
    weekdayAverageMinutes: fixedLength(data.weekday_avg_minutes, 7).map(round),
  };
}

function roundTo1Or(value: number | string | null | undefined): number | null {
  const n = toNumber(value);
  return n === null ? null : roundTo1(n);
}

function fixedLength<T>(values: T[] | null | undefined, length: number): (T | null)[] {
  const source = values ?? [];
  return Array.from({ length }, (_, i) => source[i] ?? null);
}

export async function getSleepLog(userId: string, id: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(id)) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSleepLog(data as SleepLogRow) : null;
}

export async function saveSleepLog(userId: string, input: SleepInput, logId?: string) {
  const client = requireSupabase();
  const payload = {
    duration_minutes: input.durationMinutes,
    quality: input.quality,
    notes: sanitizeUserText(input.notes).trim(),
    // `undefined` leaves any stored window untouched; `null` explicitly deletes
    // it (duration-only mode retains no hidden exact times). The database
    // validates the payload and derives the duration from it (#800).
    ...(input.window !== undefined
      ? { sleep_window: input.window ? JSON.stringify(input.window) : null }
      : {}),
    ...(input.loggedAt
      ? {
          logged_at: input.loggedAt,
          // `undefined` means the caller never had an opinion (quick-log paths) -
          // this device, now, is the honest answer. An explicit `null` means the
          // entry has no captured offset and must keep it, so an unrelated edit
          // cannot stamp it with wherever the user stands today (#250).
          logged_offset_minutes:
            input.loggedOffsetMinutes === undefined
              ? -new Date(input.loggedAt).getTimezoneOffset()
              : input.loggedOffsetMinutes,
        }
      : {}),
  };

  const insertPayload: Record<string, unknown> = { ...payload, user_id: userId };

  const query = logId
    ? client.from("sleep_logs").update(payload).eq("user_id", userId).eq("id", logId)
    : client.from("sleep_logs").insert(insertPayload);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Sleep log not found");
  return mapSleepLog(data as SleepLogRow);
}

export async function deleteSleepLog(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from("sleep_logs").delete().eq("user_id", userId).eq("id", id);

  if (error) throw error;
}
