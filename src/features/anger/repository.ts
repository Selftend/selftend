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
    .order("created_at", { ascending: false })
    .limit(500);

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

export async function saveAngerLog(userId: string, input: AngerLogInput, logId?: string) {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    trigger_text: input.triggerText.trim(),
    interpretation: input.interpretation.trim(),
    arousal_level: input.arousalLevel,
    urge: input.urge.trim(),
    behavior_chosen: input.behaviorChosen.trim(),
    consequence: input.consequence.trim(),
    time_out_taken: input.timeOutTaken,
    alternative_interpretation: input.alternativeInterpretation.trim(),
    outcome_rating: input.outcomeRating,
    notes: input.notes.trim(),
  };

  const query = logId
    ? client.from("anger_logs").update(payload).eq("user_id", userId).eq("id", logId)
    : client.from("anger_logs").insert({
        ...payload,
        ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
      });

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Anger log not found");
  return mapAngerLog(data as AngerLogRow);
}

export async function deleteAngerLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { error } = await client.from("anger_logs").delete().eq("user_id", userId).eq("id", logId);

  if (error) throw error;
}
