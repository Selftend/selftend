import type { ChoicePoint, ChoicePointInput } from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle, mutateVoid } from "./helpers";

interface ChoicePointRow {
  id: string;
  user_id: string;
  hooks: string[] | null;
  away_moves: string[] | null;
  toward_moves: string[] | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapChoicePoint(row: ChoicePointRow): ChoicePoint {
  return {
    id: row.id,
    userId: row.user_id,
    hooks: row.hooks ?? [],
    awayMoves: row.away_moves ?? [],
    towardMoves: row.toward_moves ?? [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listChoicePoints(userId: string, limit = 30) {
  return selectList<ChoicePointRow, ChoicePoint>(
    (c) =>
      c
        .from("act_choice_points")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapChoicePoint,
  );
}

export async function getChoicePoint(userId: string, choicePointId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(choicePointId)) return null;
  return selectMaybe<ChoicePointRow, ChoicePoint>(
    (c) =>
      c
        .from("act_choice_points")
        .select("*")
        .eq("user_id", userId)
        .eq("id", choicePointId)
        .maybeSingle(),
    mapChoicePoint,
  );
}

export async function saveChoicePoint(userId: string, input: ChoicePointInput) {
  return writeSingle<ChoicePointRow, ChoicePoint>(
    (c) =>
      c
        .from("act_choice_points")
        .insert({
          user_id: userId,
          hooks: input.hooks ?? [],
          away_moves: input.awayMoves ?? [],
          toward_moves: input.towardMoves ?? [],
          notes: sanitizeUserText(input.notes ?? "").trim(),
          ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
        })
        .select("*")
        .single(),
    mapChoicePoint,
  );
}

export async function deleteChoicePoint(userId: string, choicePointId: string) {
  return mutateVoid((c) =>
    c.from("act_choice_points").delete().eq("user_id", userId).eq("id", choicePointId),
  );
}
