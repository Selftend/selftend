import type { SelfCareLog, SelfCareLogInput } from "@/src/features/self-care/types";
import { requireSupabase } from "@/src/lib/supabase";

interface SelfCareLogRow {
  id: string;
  user_id: string;
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  exercise_done: boolean;
  exercise_minutes: number | null;
  exercise_type: string;
  meals_structured: number | null;
  emotional_eating: boolean;
  social_connection_made: boolean;
  social_notes: string;
  meaningful_activity: string;
  gratitude: string[] | null;
  created_at: string;
  updated_at: string;
}

function mapSelfCareLog(row: SelfCareLogRow): SelfCareLog {
  return {
    id: row.id,
    userId: row.user_id,
    logDate: row.log_date,
    sleepHours: row.sleep_hours,
    sleepQuality: row.sleep_quality,
    exerciseDone: row.exercise_done,
    exerciseMinutes: row.exercise_minutes,
    exerciseType: row.exercise_type,
    mealsStructured: row.meals_structured,
    emotionalEating: row.emotional_eating,
    socialConnectionMade: row.social_connection_made,
    socialNotes: row.social_notes,
    meaningfulActivity: row.meaningful_activity,
    gratitude: row.gratitude ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSelfCareLog(userId: string, logDate: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("self_care_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSelfCareLog(data as SelfCareLogRow) : null;
}

export async function listSelfCareLogs(userId: string, limit = 14) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("self_care_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as SelfCareLogRow[]).map(mapSelfCareLog);
}

export async function upsertSelfCareLog(userId: string, input: SelfCareLogInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("self_care_logs")
    .upsert(
      {
        user_id: userId,
        log_date: input.logDate,
        sleep_hours: input.sleepHours,
        sleep_quality: input.sleepQuality,
        exercise_done: input.exerciseDone,
        exercise_minutes: input.exerciseMinutes,
        exercise_type: input.exerciseType.trim(),
        meals_structured: input.mealsStructured,
        emotional_eating: input.emotionalEating,
        social_connection_made: input.socialConnectionMade,
        social_notes: input.socialNotes.trim(),
        meaningful_activity: input.meaningfulActivity.trim(),
        gratitude: input.gratitude.filter((g) => g.trim().length > 0),
      },
      { onConflict: "user_id,log_date" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapSelfCareLog(data as SelfCareLogRow);
}
