import type {
  ACTLifeDomain,
  ActionStatus,
  CommittedAction,
  CommittedActionInput,
  CommittedActionPatch,
} from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle, mutateVoid } from "./helpers";

interface CommittedActionRow {
  id: string;
  user_id: string;
  life_domain: string;
  title: string;
  description: string;
  status: string;
  target_date: string | null;
  obstacles: string;
  created_at: string;
  updated_at: string;
}

function mapCommittedAction(row: CommittedActionRow): CommittedAction {
  return {
    id: row.id,
    userId: row.user_id,
    lifeDomain: row.life_domain as ACTLifeDomain,
    title: row.title,
    description: row.description,
    status: row.status as ActionStatus,
    targetDate: row.target_date,
    obstacles: row.obstacles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCommittedActions(userId: string, status?: ActionStatus) {
  return selectList<CommittedActionRow, CommittedAction>((c) => {
    let query = c
      .from("act_committed_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    return query;
  }, mapCommittedAction);
}

export async function getCommittedAction(userId: string, actionId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(actionId)) return null;
  return selectMaybe<CommittedActionRow, CommittedAction>(
    (c) =>
      c
        .from("act_committed_actions")
        .select("*")
        .eq("user_id", userId)
        .eq("id", actionId)
        .maybeSingle(),
    mapCommittedAction,
  );
}

export async function saveCommittedAction(userId: string, input: CommittedActionInput) {
  return writeSingle<CommittedActionRow, CommittedAction>(
    (c) =>
      c
        .from("act_committed_actions")
        .insert({
          user_id: userId,
          life_domain: input.lifeDomain,
          title: sanitizeUserText(input.title).trim(),
          description: sanitizeUserText(input.description ?? "").trim(),
          status: input.status ?? "active",
          target_date: input.targetDate ?? null,
          obstacles: sanitizeUserText(input.obstacles ?? "").trim(),
        })
        .select("*")
        .single(),
    mapCommittedAction,
  );
}

export async function updateCommittedAction(
  userId: string,
  actionId: string,
  patch: CommittedActionPatch,
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) payload.title = sanitizeUserText(patch.title).trim();
  if (patch.description !== undefined)
    payload.description = sanitizeUserText(patch.description).trim();
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.targetDate !== undefined) payload.target_date = patch.targetDate;
  if (patch.obstacles !== undefined) payload.obstacles = sanitizeUserText(patch.obstacles).trim();

  return writeSingle<CommittedActionRow, CommittedAction>(
    (c) =>
      c
        .from("act_committed_actions")
        .update(payload)
        .eq("user_id", userId)
        .eq("id", actionId)
        .select("*")
        .single(),
    mapCommittedAction,
  );
}

export async function deleteCommittedAction(userId: string, actionId: string) {
  return mutateVoid((c) =>
    c.from("act_committed_actions").delete().eq("user_id", userId).eq("id", actionId),
  );
}
