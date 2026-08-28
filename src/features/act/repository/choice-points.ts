import type { ChoicePoint, ChoicePointInput } from "@/src/features/act/types";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import {
  countRows,
  degradeMissingSchema,
  mutateVoid,
  selectList,
  selectMaybe,
  writeSingle,
} from "./helpers";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";

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

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function getLatestChoicePointAt(userId: string) {
  return degradeMissingSchema(
    () => fetchLatestActivity({ table: "act_choice_points", userId, column: "created_at" }),
    null,
  );
}

/** Every choice point this user has ever mapped, for ACT home's first stat (#1378). */
export async function countChoicePoints(userId: string) {
  return countRows((c) =>
    c.from("act_choice_points").select("id", { count: "exact", head: true }).eq("user_id", userId),
  );
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

/**
 * One page of every choice point, newest first - the archive read behind `/modules/act/choice-point` (#1517).
 *
 * Keyset on the plaintext `created_at` rather than `.range()`: ACT rows are encrypted, so
 * ADR-0001 prices a read at `rows returned x encrypted columns`, and an offset page
 * re-reads and re-decrypts every row it skips. Ordering and filtering stay plaintext,
 * which is exactly what lets the `LIMIT` push below the decrypt.
 *
 * `id` breaks the tie so a page boundary cannot straddle two rows sharing a
 * timestamp - `created_at` is not unique.
 */
export async function listChoicePointsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<ChoicePointRow, ChoicePoint>((c) => {
    let query = c
      .from("act_choice_points")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapChoicePoint);
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
