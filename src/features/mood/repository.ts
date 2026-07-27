import type { MoodInput, MoodLog } from "@/src/features/mood/types";
import { entryDayKey, type CapturedOffsetMinutes } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface MoodLogRow {
  id: string;
  user_id: string;
  mood_score: number;
  emotions: string[] | null;
  notes: string;
  linked_strategy: string | null;
  logged_at: string;
  logged_offset_minutes?: number | null;
  created_at: string;
  situation: string;
  thoughts: string;
  behaviours: string;
  bodily_sensations: string;
}

function mapMoodLog(row: MoodLogRow): MoodLog {
  const loggedOffsetMinutes = row.logged_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    moodScore: row.mood_score,
    emotions: row.emotions ?? [],
    notes: row.notes,
    linkedStrategy: row.linked_strategy,
    loggedAt: row.logged_at,
    loggedOffsetMinutes,
    dayKey: entryDayKey(row.logged_at, loggedOffsetMinutes),
    createdAt: row.created_at,
    situation: row.situation,
    thoughts: row.thoughts,
    behaviours: row.behaviours,
    bodilySensations: row.bodily_sensations,
  };
}

export async function listMoodLogs(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("mood_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MoodLogRow[]).map(mapMoodLog);
}

export async function getMoodLog(userId: string, id: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(id)) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("mood_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMoodLog(data as MoodLogRow) : null;
}

export async function deleteMoodLog(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from("mood_logs").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function saveMoodLog(userId: string, input: MoodInput, moodLogId?: string) {
  const client = requireSupabase();
  const loggedAt = input.loggedAt ?? new Date().toISOString();
  // `undefined` means the caller never had an opinion (quick-log paths) - this
  // device, right now, is the honest answer. An explicit `null` means the entry
  // has no captured offset and must keep it, so an unrelated edit can't stamp a
  // year-old log with wherever the user happens to be standing today (#250).
  const loggedOffsetMinutes: CapturedOffsetMinutes =
    input.loggedOffsetMinutes === undefined
      ? -new Date(loggedAt).getTimezoneOffset()
      : input.loggedOffsetMinutes;
  const payload = {
    mood_score: input.moodScore,
    emotions: input.emotions,
    notes: sanitizeUserText(input.notes).trim(),
    linked_strategy: input.linkedStrategy ?? null,
    logged_at: loggedAt,
    logged_offset_minutes: loggedOffsetMinutes,
    situation: sanitizeUserText(input.situation).trim(),
    thoughts: sanitizeUserText(input.thoughts).trim(),
    behaviours: sanitizeUserText(input.behaviours).trim(),
    bodily_sensations: sanitizeUserText(input.bodilySensations).trim(),
  };

  const query = moodLogId
    ? client.from("mood_logs").update(payload).eq("user_id", userId).eq("id", moodLogId)
    : client.from("mood_logs").insert({ ...payload, user_id: userId });

  const { data, error } = await query.select("*").maybeSingle();

  if (error) throw error;
  // #85: an update against a missing/RLS-hidden row returns 0 rows; maybeSingle() gives a
  // clean not-found here instead of single()'s opaque PGRST116. Inserts always return their
  // row, so this never false-positives on create.
  if (!data) throw new Error("Mood log not found");
  return mapMoodLog(data as MoodLogRow);
}

export interface MoodScorePoint {
  loggedAt: string;
  loggedOffsetMinutes: CapturedOffsetMinutes;
  /** Civil day this point belongs to; the only thing the chart and heatmap group on. */
  dayKey: string;
  moodScore: number;
}

interface MoodScorePointRow {
  logged_at: string;
  logged_offset_minutes: number | null;
  mood_score: number;
}

// PostgREST caps every response (1,000 rows on Supabase's default max-rows), so a
// single unbounded select would silently truncate long windows to their oldest page.
const SCORE_POINTS_PAGE = 1000;

// The bounds filter `logged_at`, a UTC instant, but points are bucketed by the
// civil day captured with them - so a day key near either edge can sit up to 14h
// (the ±840min offset ceiling) outside the instant window and be missed. Pad by a
// whole day: comfortably past the ceiling, and immune to the constraint changing
// under us. Callers already iterate an explicit key range, so the surplus rows
// fall outside it and are ignored.
const WINDOW_PAD_MS = 24 * 60 * 60 * 1000;

function padIso(iso: string, direction: 1 | -1): string {
  return new Date(new Date(iso).getTime() + direction * WINDOW_PAD_MS).toISOString();
}

/**
 * Trend-window fetch: only timestamp, offset, and score — never the free-text
 * columns — paged past the PostgREST response cap, so any range renders with
 * full daily resolution.
 */
export async function listMoodScorePoints(
  userId: string,
  fromIso: string,
  toIso?: string,
): Promise<MoodScorePoint[]> {
  const client = requireSupabase();
  const points: MoodScorePoint[] = [];
  for (let offset = 0; ; offset += SCORE_POINTS_PAGE) {
    let query = client
      .from("mood_logs")
      .select("logged_at, logged_offset_minutes, mood_score")
      .eq("user_id", userId)
      .gte("logged_at", padIso(fromIso, -1));
    if (toIso) query = query.lte("logged_at", padIso(toIso, 1));
    const { data, error } = await query
      .order("logged_at", { ascending: true })
      .range(offset, offset + SCORE_POINTS_PAGE - 1);

    if (error) throw error;
    const rows = data as MoodScorePointRow[];
    for (const row of rows) {
      const loggedOffsetMinutes = row.logged_offset_minutes ?? null;
      points.push({
        loggedAt: row.logged_at,
        loggedOffsetMinutes,
        dayKey: entryDayKey(row.logged_at, loggedOffsetMinutes),
        moodScore: row.mood_score,
      });
    }
    if (rows.length < SCORE_POINTS_PAGE) return points;
  }
}

/**
 * Civil day of the user's earliest log — the lower clamp for custom trend ranges.
 * Resolved from that row's own captured offset so the picker cannot refuse a day
 * the user actually has an entry on.
 */
// Captured offsets span -840..+840 minutes, so two rows can sit up to 28 hours
// apart in UTC and still land on the same civil day - and a LATER instant can
// belong to an EARLIER day. Any row more than this far past the earliest instant
// has a shifted time past that row's own, so it cannot start an earlier day.
const OFFSET_SPAN_MS = 2 * 840 * 60_000;

export async function getFirstMoodDayKey(userId: string): Promise<string | null> {
  const client = requireSupabase();
  const earliest = await client
    .from("mood_logs")
    .select("logged_at, logged_offset_minutes")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (earliest.error) throw earliest.error;
  const first = earliest.data as {
    logged_at: string;
    logged_offset_minutes: number | null;
  } | null;
  if (!first) return null;

  // The earliest UTC instant is not necessarily the earliest civil day: a 15:30Z
  // log at +09:00 is Jan 2, while a later 16:00Z log at -08:00 is Jan 1. Taking
  // the first row's key alone made the picker refuse a day the user has an entry
  // on, so scan the window where an earlier day is still arithmetically possible.
  const windowEnd = new Date(new Date(first.logged_at).getTime() + OFFSET_SPAN_MS).toISOString();
  const { data, error } = await client
    .from("mood_logs")
    .select("logged_at, logged_offset_minutes")
    .eq("user_id", userId)
    .lte("logged_at", windowEnd);

  if (error) throw error;
  const rows = (data ?? []) as { logged_at: string; logged_offset_minutes: number | null }[];

  let earliestKey = entryDayKey(first.logged_at, first.logged_offset_minutes ?? null);
  for (const row of rows) {
    // Day keys are YYYY-MM-DD, so lexical comparison is chronological.
    const key = entryDayKey(row.logged_at, row.logged_offset_minutes ?? null);
    if (key < earliestKey) earliestKey = key;
  }
  return earliestKey;
}

export async function countMoodLogs(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("mood_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}
