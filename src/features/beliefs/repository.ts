import type { CoreBelief, CoreBeliefInput } from "@/src/features/beliefs/types";
import { requireSupabase } from "@/src/lib/supabase";

interface CoreBeliefRow {
  id: string;
  user_id: string;
  belief_statement: string;
  triggering_situations: string[] | null;
  evidence_for: string[] | null;
  evidence_against: string[] | null;
  alternative_belief: string;
  original_belief_strength: number;
  alternative_belief_strength: number;
  reinforcement_plan: string;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapCoreBelief(row: CoreBeliefRow): CoreBelief {
  return {
    id: row.id,
    userId: row.user_id,
    beliefStatement: row.belief_statement,
    triggeringSituations: row.triggering_situations ?? [],
    evidenceFor: row.evidence_for ?? [],
    evidenceAgainst: row.evidence_against ?? [],
    alternativeBelief: row.alternative_belief,
    originalBeliefStrength: row.original_belief_strength,
    alternativeBeliefStrength: row.alternative_belief_strength,
    reinforcementPlan: row.reinforcement_plan,
    nextReviewDate: row.next_review_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCoreBeliefs(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("core_beliefs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data as CoreBeliefRow[]).map(mapCoreBelief);
}

export async function getCoreBelief(userId: string, beliefId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("core_beliefs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCoreBelief(data as CoreBeliefRow) : null;
}

export async function saveCoreBelief(userId: string, input: CoreBeliefInput, beliefId?: string) {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    belief_statement: input.beliefStatement.trim(),
    triggering_situations: input.triggeringSituations,
    evidence_for: input.evidenceFor,
    evidence_against: input.evidenceAgainst,
    alternative_belief: input.alternativeBelief.trim(),
    original_belief_strength: input.originalBeliefStrength,
    alternative_belief_strength: input.alternativeBeliefStrength,
    reinforcement_plan: input.reinforcementPlan.trim(),
    next_review_date: input.nextReviewDate,
  };

  const query = beliefId
    ? client.from("core_beliefs").update(payload).eq("user_id", userId).eq("id", beliefId)
    : client.from("core_beliefs").insert(payload);

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Core belief not found");
  return mapCoreBelief(data as CoreBeliefRow);
}

export async function deleteCoreBelief(userId: string, beliefId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("core_beliefs")
    .delete()
    .eq("user_id", userId)
    .eq("id", beliefId);

  if (error) throw error;
}

export async function updateBeliefStrength(
  userId: string,
  beliefId: string,
  originalBeliefStrength: number,
  alternativeBeliefStrength: number,
) {
  const client = requireSupabase();
  const { error } = await client
    .from("core_beliefs")
    .update({
      original_belief_strength: originalBeliefStrength,
      alternative_belief_strength: alternativeBeliefStrength,
    })
    .eq("user_id", userId)
    .eq("id", beliefId);

  if (error) throw error;
}
