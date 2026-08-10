import type { MindfulnessSession, MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";
import { entryDayKey, occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface MindfulnessSessionRow {
  id: string;
  user_id: string;
  exercise_name: string;
  duration_minutes: number;
  reflection: string;
  mood_after: number | null;
  feeling_after: string | null;
  completed_at: string;
  completed_offset_minutes?: number | null;
  created_at: string;
  cycles: number | null;
  duration_seconds: number | null;
}

function mapSession(row: MindfulnessSessionRow): MindfulnessSession {
  const completedOffsetMinutes = row.completed_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    exerciseName: row.exercise_name,
    durationMinutes: row.duration_minutes,
    reflection: row.reflection,
    moodAfter: row.mood_after,
    feelingAfter: row.feeling_after,
    completedAt: row.completed_at,
    completedOffsetMinutes,
    dayKey: entryDayKey(row.completed_at, completedOffsetMinutes),
    createdAt: row.created_at,
    cycles: row.cycles ?? null,
    durationSeconds: row.duration_seconds ?? null,
  };
}

export async function listMindfulnessSessions(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("mindfulness_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MindfulnessSessionRow[]).map(mapSession);
}

export async function listMindfulnessSessionsByNames(
  userId: string,
  exerciseNames: string[],
  limit = 30,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("mindfulness_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("exercise_name", exerciseNames)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MindfulnessSessionRow[]).map(mapSession);
}

/**
 * One page of every session that is NOT one of the given exercise types, newest first -
 * the breathing all-history screen's read (#696).
 *
 * ⚠️ By EXCLUSION, deliberately, where the recent-window read above works by inclusion.
 * Breathing is an open set: a custom pattern's sessions carry the pattern's row id as
 * their name, and **deleting the pattern does not delete its sessions**. An inclusive
 * filter built from the patterns that still exist therefore drops the history of every
 * deleted one - silently, from the screen whose entire job is being the complete record,
 * and while the header's count and minutes (which count by exclusion) still include them.
 * The two would disagree, and the screen would be the one lying. `breathing.deletedExercise`
 * already exists to name those rows, which is the tell that they are meant to show.
 *
 * The exclusive `(completed_at, id)` cursor keeps the boundary stable across writes.
 * `id` is required because two sessions can share a completion timestamp; timestamp
 * alone would not form a total order.
 */
export async function listMindfulnessSessionsExcludingNamesPage(
  userId: string,
  excludedNames: string[],
  limit: number,
  cursor: RecordCursor | null,
) {
  const client = requireSupabase();
  const quoted = excludedNames.map((name) => `"${name}"`).join(",");
  let query = client
    .from("mindfulness_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("exercise_name", "in", `(${quoted})`)
    .order("completed_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) query = query.or(descendingCursorFilter("completed_at", cursor));

  const { data, error } = await query.limit(limit);

  if (error) throw error;
  return (data as MindfulnessSessionRow[]).map(mapSession);
}

/**
 * Exact lifetime minutes across every session that is NOT one of the given exercise
 * types - the breathing overview's "21 minutes" stat. Server-side for the reason
 * 20260809010000_breathing_total_minutes.sql spells out: the screen's own list is capped,
 * so summing it would quietly turn a lifetime figure into a "last 50 sessions" one.
 */
// No userId parameter: the RPC reads `auth.uid()` itself and RLS confines it, so passing
// one would be a second, ignorable source of truth about whose minutes these are.
export async function sumMindfulnessMinutesExcludingNames(
  excludedNames: string[],
): Promise<number> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("breathing_total_minutes", {
    excluded_names: excludedNames,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

// Exact count of sessions of the given exercise types (e.g. grounding) for tile stats -
// avoids fetching full rows just to display a number.
export async function countMindfulnessSessionsByNames(
  userId: string,
  exerciseNames: string[],
): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("mindfulness_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("exercise_name", exerciseNames);

  if (error) throw error;
  return count ?? 0;
}

// Exact count of every session that is NOT one of the given exercise types. Breathing
// counts by exclusion because it is an open set - built-in patterns plus user-defined
// exercises, whose sessions carry the custom exercise's id as their name - while
// grounding is the closed slug set. src/features/routines/derive.ts classifies the
// shared table the same way: not grounding means breathing.
export async function countMindfulnessSessionsExcludingNames(
  userId: string,
  excludedNames: string[],
): Promise<number> {
  const client = requireSupabase();
  const quoted = excludedNames.map((name) => `"${name}"`).join(",");
  const { count, error } = await client
    .from("mindfulness_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("exercise_name", "in", `(${quoted})`);

  if (error) throw error;
  return count ?? 0;
}

export async function saveMindfulnessSession(userId: string, input: MindfulnessSessionInput) {
  const client = requireSupabase();
  // One reading of the clock, so the instant and the offset describe the same moment.
  // Deriving them from two `new Date()` calls can straddle a DST change and pair an
  // instant with an offset that was never in force at it. `completed_at` used to be
  // left to the server default; sending it is what makes the offset meaningful (#330).
  const occurrence = occurrenceTimeFromDate();
  const { data, error } = await client
    .from("mindfulness_sessions")
    .insert({
      user_id: userId,
      exercise_name: input.exerciseName,
      duration_minutes: input.durationMinutes,
      reflection: sanitizeUserText(input.reflection).trim(),
      feeling_after: input.feelingAfter ?? null,
      mood_after: null,
      cycles: input.cycles ?? null,
      duration_seconds: input.durationSeconds ?? null,
      completed_at: occurrence.occurredAt,
      completed_offset_minutes: occurrence.occurredOffsetMinutes,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSession(data as MindfulnessSessionRow);
}
