import type {
  ACTProgramState,
  ACTProgramStateInput,
  ACTPrinciple,
  ACTConcern,
} from "@/src/features/act/types";
import { selectMaybe, writeSingle, isMissingACTSchemaError } from "./helpers";

interface ACTProgramStateRow {
  user_id: string;
  active_principles: string[] | null;
  primary_concerns: string[] | null;
  myths_acknowledged: boolean;
  onboarding_completed_at: string | null;
  last_check_in_at: string | null;
  preferred_check_in_time: string | null;
  created_at: string;
  updated_at: string;
}

function mapProgramState(row: ACTProgramStateRow): ACTProgramState {
  return {
    userId: row.user_id,
    activePrinciples: (row.active_principles ?? []) as ACTPrinciple[],
    primaryConcerns: (row.primary_concerns ?? []) as ACTConcern[],
    mythsAcknowledged: row.myths_acknowledged,
    onboardingCompletedAt: row.onboarding_completed_at,
    lastCheckInAt: row.last_check_in_at,
    preferredCheckInTime: row.preferred_check_in_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getACTProgramState(userId: string) {
  return selectMaybe<ACTProgramStateRow, ACTProgramState>(
    (c) => c.from("act_program_state").select("*").eq("user_id", userId).maybeSingle(),
    mapProgramState,
  );
}

export async function upsertACTProgramState(userId: string, patch: ACTProgramStateInput) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (patch.activePrinciples !== undefined) payload.active_principles = patch.activePrinciples;
  if (patch.primaryConcerns !== undefined) payload.primary_concerns = patch.primaryConcerns;
  if (patch.mythsAcknowledged !== undefined) payload.myths_acknowledged = patch.mythsAcknowledged;
  if (patch.onboardingCompletedAt !== undefined)
    payload.onboarding_completed_at = patch.onboardingCompletedAt;
  if (patch.lastCheckInAt !== undefined) payload.last_check_in_at = patch.lastCheckInAt;
  if (patch.preferredCheckInTime !== undefined)
    payload.preferred_check_in_time = patch.preferredCheckInTime;

  // act_program_state is a transparent encrypted view; a view cannot be the target of
  // INSERT ... ON CONFLICT, so we insert plainly and the view's INSTEAD OF trigger resolves the
  // (user_id) merge against the base table's real primary key.
  try {
    return await writeSingle<ACTProgramStateRow, ACTProgramState>(
      (c) => c.from("act_program_state").insert(payload).select("*").single(),
      mapProgramState,
    );
  } catch (error) {
    if (isMissingACTSchemaError(error)) return null; // documented legacy inconsistency — see spec "Latent issues"
    throw error;
  }
}
