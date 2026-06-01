import type {
  BreathingExercise,
  BreathingExerciseColor,
  BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";
import { requireSupabase } from "@/src/lib/supabase";

interface BreathingExerciseRow {
  id: string;
  user_id: string;
  name: string;
  inhale_seconds: number;
  hold_in_seconds: number;
  exhale_seconds: number;
  hold_out_seconds: number;
  cycles: number;
  color: BreathingExerciseColor;
  created_at: string;
  updated_at: string;
}

function mapExercise(row: BreathingExerciseRow): BreathingExercise {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    inhaleSeconds: Number(row.inhale_seconds),
    holdInSeconds: Number(row.hold_in_seconds),
    exhaleSeconds: Number(row.exhale_seconds),
    holdOutSeconds: Number(row.hold_out_seconds),
    cycles: row.cycles,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function payloadFromInput(input: BreathingExerciseInput) {
  return {
    name: input.name.trim(),
    inhale_seconds: input.inhaleSeconds,
    hold_in_seconds: input.holdInSeconds,
    exhale_seconds: input.exhaleSeconds,
    hold_out_seconds: input.holdOutSeconds,
    cycles: input.cycles,
    color: input.color,
  };
}

export async function listBreathingExercises(userId: string): Promise<BreathingExercise[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("breathing_exercises")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BreathingExerciseRow[]).map(mapExercise);
}

export async function getBreathingExercise(
  userId: string,
  id: string,
): Promise<BreathingExercise | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("breathing_exercises")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapExercise(data as BreathingExerciseRow) : null;
}

export async function saveBreathingExercise(
  userId: string,
  input: BreathingExerciseInput,
  id?: string,
): Promise<BreathingExercise> {
  const client = requireSupabase();
  const payload = payloadFromInput(input);
  const query = id
    ? client.from("breathing_exercises").update(payload).eq("user_id", userId).eq("id", id)
    : client.from("breathing_exercises").insert({ ...payload, user_id: userId });
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return mapExercise(data as BreathingExerciseRow);
}

export async function deleteBreathingExercise(userId: string, id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("breathing_exercises")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
