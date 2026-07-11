import type { ActionStep, ActionStepInput } from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, writeSingle, mutateVoid } from "./helpers";

interface ActionStepRow {
  id: string;
  user_id: string;
  action_id: string;
  description: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapActionStep(row: ActionStepRow): ActionStep {
  return {
    id: row.id,
    userId: row.user_id,
    actionId: row.action_id,
    description: row.description,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listActionSteps(userId: string, actionId: string) {
  // actionId comes from the committed-action detail route; a malformed id would 400 on the uuid cast.
  if (!isValidUuid(actionId)) return [];
  return selectList<ActionStepRow, ActionStep>(
    (c) =>
      c
        .from("act_action_steps")
        .select("*")
        .eq("user_id", userId)
        .eq("action_id", actionId)
        .order("created_at", { ascending: true }),
    mapActionStep,
  );
}

// All of a user's action steps across every committed-action plan. Used by the
// program engine's "take a values-guided step" daily signal.
export async function listAllActionSteps(userId: string) {
  return selectList<ActionStepRow, ActionStep>(
    (c) =>
      c
        .from("act_action_steps")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        // Cap the fetch (consistent with the module's other lists) - act_action_steps grows
        // unbounded and this query stays active app-wide (Home + Android widget sync).
        .limit(500),
    mapActionStep,
  );
}

export async function saveActionStep(userId: string, input: ActionStepInput) {
  return writeSingle<ActionStepRow, ActionStep>(
    (c) =>
      c
        .from("act_action_steps")
        .insert({
          user_id: userId,
          action_id: input.actionId,
          description: sanitizeUserText(input.description).trim(),
        })
        .select("*")
        .single(),
    mapActionStep,
  );
}

export async function toggleActionStep(
  userId: string,
  stepId: string,
  completed: boolean,
  completedAt: string = new Date().toISOString(),
) {
  return writeSingle<ActionStepRow, ActionStep>(
    (c) =>
      c
        .from("act_action_steps")
        .update({
          is_completed: completed,
          completed_at: completed ? completedAt : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("id", stepId)
        .select("*")
        .single(),
    mapActionStep,
  );
}

export async function deleteActionStep(userId: string, stepId: string) {
  return mutateVoid((c) =>
    c.from("act_action_steps").delete().eq("user_id", userId).eq("id", stepId),
  );
}
