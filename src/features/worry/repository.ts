import type { WorryEntry, WorryEntryInput } from "@/src/features/worry/types";
import { requireSupabase } from "@/src/lib/supabase";

interface WorryEntryRow {
  id: string;
  user_id: string;
  worry_statement: string;
  worry_category: string;
  probability_estimate: number | null;
  evidence_for: string[] | null;
  evidence_against: string[] | null;
  coping_statement: string;
  action_steps: string[] | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

function mapWorryEntry(row: WorryEntryRow): WorryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    worryStatement: row.worry_statement,
    worryCategory: row.worry_category as WorryEntry["worryCategory"],
    probabilityEstimate: row.probability_estimate,
    evidenceFor: row.evidence_for ?? [],
    evidenceAgainst: row.evidence_against ?? [],
    copingStatement: row.coping_statement,
    actionSteps: row.action_steps ?? [],
    resolved: row.resolved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWorryEntries(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("worry_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data as WorryEntryRow[]).map(mapWorryEntry);
}

export async function getWorryEntry(userId: string, entryId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("worry_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapWorryEntry(data as WorryEntryRow) : null;
}

export async function saveWorryEntry(userId: string, input: WorryEntryInput, entryId?: string) {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    worry_statement: input.worryStatement.trim(),
    worry_category: input.worryCategory,
    probability_estimate: input.probabilityEstimate ?? null,
    evidence_for: input.evidenceFor,
    evidence_against: input.evidenceAgainst,
    coping_statement: input.copingStatement.trim(),
    action_steps: input.actionSteps,
  };

  const query = entryId
    ? client.from("worry_entries").update(payload).eq("user_id", userId).eq("id", entryId)
    : client.from("worry_entries").insert({
        ...payload,
        ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
      });

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Worry entry not found");
  return mapWorryEntry(data as WorryEntryRow);
}

export async function deleteWorryEntry(userId: string, entryId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("worry_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", entryId);

  if (error) throw error;
}

export async function toggleWorryResolved(userId: string, entryId: string, resolved: boolean) {
  const client = requireSupabase();
  const { error } = await client
    .from("worry_entries")
    .update({ resolved })
    .eq("user_id", userId)
    .eq("id", entryId);

  if (error) throw error;
}
