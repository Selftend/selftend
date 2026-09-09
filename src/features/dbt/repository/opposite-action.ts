import type {
  OppositeActionDoneInput,
  OppositeActionPlan,
  OppositeActionPlanInput,
} from "@/src/features/dbt/types";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { isValidUuid } from "@/src/utils/uuid";
import {
  countRows,
  mutateVoid,
  optionalText,
  selectList,
  selectMaybe,
  writeSingle,
} from "./helpers";

interface OppositeActionPlanRow {
  id: string;
  user_id: string;
  emotion: string;
  pull: string;
  opposite_action: string;
  hold_for: string | null;
  what_shifted: string | null;
  created_at: string;
  created_offset_minutes: number | null;
  done_at: string | null;
  done_offset_minutes: number | null;
  updated_at: string;
}

function mapPlan(row: OppositeActionPlanRow): OppositeActionPlan {
  const createdOffsetMinutes = row.created_offset_minutes ?? null;
  const doneOffsetMinutes = row.done_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    emotion: row.emotion,
    pull: row.pull,
    oppositeAction: row.opposite_action,
    holdFor: row.hold_for ?? "",
    whatShifted: row.what_shifted ?? "",
    createdAt: row.created_at,
    createdOffsetMinutes,
    dayKey: entryDayKey(row.created_at, createdOffsetMinutes),
    doneAt: row.done_at,
    doneOffsetMinutes,
    doneDayKey: row.done_at ? entryDayKey(row.done_at, doneOffsetMinutes) : null,
    updatedAt: row.updated_at,
  };
}

export async function countOppositeActionPlans(userId: string) {
  return countRows((c) =>
    c
      .from("dbt_opposite_action_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  );
}

/** Newest first; the list screen splits open from done itself (#1988). */
export async function listOppositeActionPlans(userId: string, limit = 50) {
  return selectList<OppositeActionPlanRow, OppositeActionPlan>(
    (c) =>
      c
        .from("dbt_opposite_action_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapPlan,
  );
}

export async function listOppositeActionPlansPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<OppositeActionPlanRow, OppositeActionPlan>((c) => {
    let query = c
      .from("dbt_opposite_action_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapPlan);
}

export async function getOppositeActionPlan(userId: string, id: string) {
  if (!isValidUuid(id)) return null;
  return selectMaybe<OppositeActionPlanRow, OppositeActionPlan>(
    (c) =>
      c
        .from("dbt_opposite_action_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("id", id)
        .maybeSingle(),
    mapPlan,
  );
}

export async function saveOppositeActionPlan(userId: string, input: OppositeActionPlanInput) {
  return writeSingle<OppositeActionPlanRow, OppositeActionPlan>(
    (c) =>
      c
        .from("dbt_opposite_action_plans")
        .insert({
          user_id: userId,
          emotion: input.emotion.trim(),
          pull: sanitizeUserText(input.pull).trim(),
          opposite_action: sanitizeUserText(input.oppositeAction).trim(),
          hold_for: optionalText(input.holdFor, sanitizeUserText),
          created_at: input.createdAt,
          created_offset_minutes: input.createdOffsetMinutes,
        })
        .select("*")
        .single(),
    mapPlan,
  );
}

/**
 * Done from the detail - the one UPDATE a plan takes (#1992 §3). Sets the done
 * day and the optional note in a single write; nothing else on the row changes.
 */
export async function markOppositeActionPlanDone(
  userId: string,
  id: string,
  input: OppositeActionDoneInput,
) {
  return writeSingle<OppositeActionPlanRow, OppositeActionPlan>(
    (c) =>
      c
        .from("dbt_opposite_action_plans")
        .update({
          done_at: input.doneAt,
          done_offset_minutes: input.doneOffsetMinutes,
          what_shifted: optionalText(input.whatShifted, sanitizeUserText),
        })
        .eq("user_id", userId)
        .eq("id", id)
        .select("*")
        .single(),
    mapPlan,
  );
}

export async function deleteOppositeActionPlan(userId: string, id: string) {
  return mutateVoid((c) =>
    c.from("dbt_opposite_action_plans").delete().eq("user_id", userId).eq("id", id),
  );
}
