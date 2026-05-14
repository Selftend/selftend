import type { ValuesProfile, ValuesProfileInput } from "@/src/features/values/types";
import { requireSupabase } from "@/src/lib/supabase";

interface ValuesProfileRow {
  id: string;
  user_id: string;
  life_domain: string;
  importance_rating: number;
  satisfaction_rating: number;
  domain_note: string;
  created_at: string;
  updated_at: string;
}

function mapValuesProfile(row: ValuesProfileRow): ValuesProfile {
  return {
    id: row.id,
    userId: row.user_id,
    lifeDomain: row.life_domain,
    importanceRating: row.importance_rating,
    satisfactionRating: row.satisfaction_rating,
    domainNote: row.domain_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listValuesProfiles(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from("values_profile").select("*").eq("user_id", userId);

  if (error) throw error;
  return (data as ValuesProfileRow[]).map(mapValuesProfile);
}

export async function upsertValuesProfile(userId: string, input: ValuesProfileInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("values_profile")
    .upsert(
      {
        user_id: userId,
        life_domain: input.lifeDomain,
        importance_rating: input.importanceRating,
        satisfaction_rating: input.satisfactionRating,
        domain_note: input.domainNote.trim(),
      },
      { onConflict: "user_id,life_domain" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapValuesProfile(data as ValuesProfileRow);
}
