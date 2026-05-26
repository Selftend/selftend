import type { MindfulnessSession, MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { requireSupabase } from "@/src/lib/supabase";

interface MindfulnessSessionRow {
  id: string;
  user_id: string;
  exercise_name: string;
  duration_minutes: number;
  reflection: string;
  mood_after: number | null;
  feeling_after: string | null;
  completed_at: string;
  created_at: string;
}

function mapSession(row: MindfulnessSessionRow): MindfulnessSession {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseName: row.exercise_name,
    durationMinutes: row.duration_minutes,
    reflection: row.reflection,
    moodAfter: row.mood_after,
    feelingAfter: row.feeling_after,
    completedAt: row.completed_at,
    createdAt: row.created_at,
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

export async function saveMindfulnessSession(userId: string, input: MindfulnessSessionInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("mindfulness_sessions")
    .insert({
      user_id: userId,
      exercise_name: input.exerciseName,
      duration_minutes: input.durationMinutes,
      reflection: input.reflection.trim(),
      feeling_after: input.feelingAfter ?? null,
      mood_after: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSession(data as MindfulnessSessionRow);
}

export async function getMindfulnessSession(userId: string, sessionId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("mindfulness_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSession(data as MindfulnessSessionRow);
}
