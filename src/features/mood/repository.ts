import type { MoodInput, MoodLog } from "@/src/features/mood/types";
import { requireSupabase } from "@/src/lib/supabase";

interface MoodLogRow {
  id: string;
  user_id: string;
  mood_score: number;
  emotions: string[] | null;
  notes: string;
  linked_strategy: string | null;
  logged_at: string;
  created_at: string;
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
    createdAt: row.created_at,
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
  const payload = {
    mood_score: input.moodScore,
    emotions: input.emotions,
    notes: input.notes.trim(),
    linked_strategy: input.linkedStrategy ?? null,
    logged_at: loggedAt,
  };

  const query = moodLogId
    ? client.from("mood_logs").update(payload).eq("user_id", userId).eq("id", moodLogId)
    : client.from("mood_logs").insert({ ...payload, user_id: userId });

  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return mapMoodLog(data as MoodLogRow);
}
