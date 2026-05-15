import type { MeditationSession } from "@/src/features/meditation/types";
import { requireSupabase } from "@/src/lib/supabase";

interface MeditationSessionRow {
  id: string;
  user_id: string;
  duration_minutes: number;
  completed_at: string;
  created_at: string;
}

function mapSession(row: MeditationSessionRow): MeditationSession {
  return {
    id: row.id,
    userId: row.user_id,
    durationMinutes: row.duration_minutes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function listMeditationSessions(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MeditationSessionRow[]).map(mapSession);
}

export async function saveMeditationSession(userId: string, durationMinutes: number) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .insert({ user_id: userId, duration_minutes: durationMinutes })
    .select("*")
    .single();

  if (error) throw error;
  return mapSession(data as MeditationSessionRow);
}
