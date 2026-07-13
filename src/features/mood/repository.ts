import type { MoodInput, MoodLog } from "@/src/features/mood/types";
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
  logged_offset_minutes?: number;
  created_at: string;
  situation: string;
  thoughts: string;
  behaviours: string;
  bodily_sensations: string;
}

function mapMoodLog(row: MoodLogRow): MoodLog {
  return {
    id: row.id,
    userId: row.user_id,
    moodScore: row.mood_score,
    emotions: row.emotions ?? [],
    notes: row.notes,
    linkedStrategy: row.linked_strategy,
    loggedAt: row.logged_at,
    loggedOffsetMinutes: row.logged_offset_minutes ?? 0,
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
  const loggedOffsetMinutes = input.loggedOffsetMinutes ?? -new Date(loggedAt).getTimezoneOffset();
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

export async function countMoodLogs(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("mood_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}
