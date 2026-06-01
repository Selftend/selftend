import type {
  ChallengePlan,
  ChallengePlanInput,
  RecoveryPlan,
  RecoveryPlanInput,
} from "@/src/features/recovery/types";
import { requireSupabase } from "@/src/lib/supabase";

interface RecoveryPlanRow {
  id: string;
  user_id: string;
  recovery_keys: string[] | null;
  personal_slogan: string;
  strategy_integration_notes: Record<string, unknown> | null;
  maintenance_commitments: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ChallengePlanRow {
  id: string;
  recovery_plan_id: string;
  user_id: string;
  challenge_description: string;
  coping_steps: string[] | null;
  created_at: string;
  updated_at: string;
}

function mapStrategyNotes(notes: Record<string, unknown> | null): Record<string, string> {
  if (!notes) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(notes).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function mapRecoveryPlan(row: RecoveryPlanRow): RecoveryPlan {
  return {
    id: row.id,
    userId: row.user_id,
    recoveryKeys: row.recovery_keys ?? [],
    personalSlogan: row.personal_slogan,
    strategyIntegrationNotes: mapStrategyNotes(row.strategy_integration_notes),
    maintenanceCommitments: row.maintenance_commitments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChallengePlan(row: ChallengePlanRow): ChallengePlan {
  return {
    id: row.id,
    recoveryPlanId: row.recovery_plan_id,
    userId: row.user_id,
    challengeDescription: row.challenge_description,
    copingSteps: row.coping_steps ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeList(values: string[]) {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function sanitizeNotes(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
}

export async function getRecoveryPlan(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("recovery_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRecoveryPlan(data as RecoveryPlanRow) : null;
}

export async function upsertRecoveryPlan(userId: string, input: RecoveryPlanInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("recovery_plans")
    .upsert(
      {
        user_id: userId,
        recovery_keys: sanitizeList(input.recoveryKeys),
        personal_slogan: input.personalSlogan.trim(),
        strategy_integration_notes: sanitizeNotes(input.strategyIntegrationNotes),
        maintenance_commitments: sanitizeList(input.maintenanceCommitments),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapRecoveryPlan(data as RecoveryPlanRow);
}

export async function listChallengePlans(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("challenge_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data as ChallengePlanRow[]).map(mapChallengePlan);
}

export async function saveChallengePlan(
  userId: string,
  recoveryPlanId: string,
  input: ChallengePlanInput,
  challengePlanId?: string,
) {
  const client = requireSupabase();
  const payload = {
    recovery_plan_id: recoveryPlanId,
    user_id: userId,
    challenge_description: input.challengeDescription.trim(),
    coping_steps: sanitizeList(input.copingSteps),
  };

  const query = challengePlanId
    ? client.from("challenge_plans").update(payload).eq("user_id", userId).eq("id", challengePlanId)
    : client.from("challenge_plans").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return mapChallengePlan(data as ChallengePlanRow);
}

export async function deleteChallengePlan(userId: string, challengePlanId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("challenge_plans")
    .delete()
    .eq("user_id", userId)
    .eq("id", challengePlanId);

  if (error) throw error;
}
