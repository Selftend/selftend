import type { AngerLog, AngerLogInput } from "@/src/features/anger/types";
import { requireSupabase } from "@/src/lib/supabase";

interface AngerLogRow {
  id: string;
  user_id: string;
  trigger_text: string;
  interpretation: string;
  arousal_level: number;
  urge: string;
  behavior_chosen: string;
  consequence: string;
  time_out_taken: boolean;
  alternative_interpretation: string;
  outcome_rating: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapAngerLog(row: AngerLogRow): AngerLog {
  return {
    id: row.id,
    userId: row.user_id,
    triggerText: row.trigger_text,
    interpretation: row.interpretation,
    arousalLevel: row.arousal_level,
    urge: row.urge,
    behaviorChosen: row.behavior_chosen,
    consequence: row.consequence,
    timeOutTaken: row.time_out_taken,
    alternativeInterpretation: row.alternative_interpretation,
    outcomeRating: row.outcome_rating,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAngerLogs(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("anger_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as AngerLogRow[]).map(mapAngerLog);
}

export async function getAngerLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("anger_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", logId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapAngerLog(data as AngerLogRow) : null;
}

export async function saveAngerLog(userId: string, input: AngerLogInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("anger_logs")
    .insert({
      user_id: userId,
      trigger_text: input.triggerText.trim(),
      interpretation: input.interpretation.trim(),
      arousal_level: input.arousalLevel,
      urge: input.urge.trim(),
      behavior_chosen: input.behaviorChosen.trim(),
      consequence: input.consequence.trim(),
      time_out_taken: input.timeOutTaken,
      alternative_interpretation: input.alternativeInterpretation.trim(),
      outcome_rating: input.outcomeRating ?? null,
      notes: input.notes.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapAngerLog(data as AngerLogRow);
}
