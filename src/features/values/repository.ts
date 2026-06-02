import type { ValuesProfile, ValuesProfileInput } from "@/src/features/values/types";
import { requireSupabase } from "@/src/lib/supabase";

interface ValuesProfileRow {
  id: string;
  user_id: string;
  personal_values: { key: string; tier: number }[];
  priority_values: string[];
  updated_at: string;
}

function mapValuesProfile(row: ValuesProfileRow): ValuesProfile {
  return {
    id: row.id,
    userId: row.user_id,
    personalValues: row.personal_values as ValuesProfile["personalValues"],
    priorityValues: row.priority_values ?? [],
    updatedAt: row.updated_at,
  };
}

export async function getValuesProfile(userId: string): Promise<ValuesProfile | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("values_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapValuesProfile(data as ValuesProfileRow) : null;
}

export async function saveValuesProfile(
  userId: string,
  input: ValuesProfileInput,
): Promise<ValuesProfile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("values_profile")
    .upsert(
      {
        user_id: userId,
        personal_values: input.personalValues,
        priority_values: input.priorityValues,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapValuesProfile(data as ValuesProfileRow);
}
