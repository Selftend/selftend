import type { MindfulnessSession, MindfulnessSessionInput } from "@/src/features/mindfulness/types";
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
