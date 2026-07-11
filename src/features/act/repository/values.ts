import type { ValueEntry, ValueEntryInput, ACTLifeDomain } from "@/src/features/act/types";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle } from "./helpers";

interface ValueEntryRow {
  id: string;
  user_id: string;
  life_domain: string;
  value_statement: string;
  importance_rating: number | null;
  current_alignment_rating: number | null;
  current_actions_note: string;
  desired_actions_note: string;
  barriers: string;
  created_at: string;
  updated_at: string;
}

function mapValueEntry(row: ValueEntryRow): ValueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    lifeDomain: row.life_domain as ACTLifeDomain,
    valueStatement: row.value_statement,
    importanceRating: row.importance_rating,
    currentAlignmentRating: row.current_alignment_rating,
    currentActionsNote: row.current_actions_note,
    desiredActionsNote: row.desired_actions_note,
    barriers: row.barriers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listValueEntries(userId: string) {
  return selectList<ValueEntryRow, ValueEntry>(
    (c) => c.from("act_value_entries").select("*").eq("user_id", userId).order("life_domain"),
    mapValueEntry,
  );
}

export async function getValueEntryByDomain(userId: string, domain: ACTLifeDomain) {
  return selectMaybe<ValueEntryRow, ValueEntry>(
    (c) =>
      c
        .from("act_value_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("life_domain", domain)
        .maybeSingle(),
    mapValueEntry,
  );
}

export async function upsertValueEntry(userId: string, input: ValueEntryInput) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    life_domain: input.lifeDomain,
    updated_at: new Date().toISOString(),
  };
  if (input.valueStatement !== undefined)
    payload.value_statement = sanitizeUserText(input.valueStatement).trim();
  if (input.importanceRating !== undefined) payload.importance_rating = input.importanceRating;
  if (input.currentAlignmentRating !== undefined)
    payload.current_alignment_rating = input.currentAlignmentRating;
  if (input.currentActionsNote !== undefined)
    payload.current_actions_note = sanitizeUserText(input.currentActionsNote).trim();
  if (input.desiredActionsNote !== undefined)
    payload.desired_actions_note = sanitizeUserText(input.desiredActionsNote).trim();
  if (input.barriers !== undefined) payload.barriers = sanitizeUserText(input.barriers).trim();

  // act_value_entries is a transparent encrypted view; a view cannot be the target of
  // INSERT ... ON CONFLICT, so we insert plainly and the view's INSTEAD OF trigger resolves the
  // (user_id, life_domain) merge against the base table's real unique key.
  return writeSingle<ValueEntryRow, ValueEntry>(
    (c) => c.from("act_value_entries").insert(payload).select("*").single(),
    mapValueEntry,
  );
}
