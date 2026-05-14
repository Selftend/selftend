import type { Goal, GoalInput, GoalStatus, Milestone, MilestoneInput } from "@/src/features/goals/types";
import { requireSupabase } from "@/src/lib/supabase";

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  life_domain: string;
  goal_type: string;
  target_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MilestoneRow {
  id: string;
  goal_id: string;
  user_id: string;
  description: string;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    lifeDomain: row.life_domain,
    goalType: row.goal_type,
    targetDate: row.target_date,
    status: row.status as GoalStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    description: row.description,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listGoals(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as GoalRow[]).map(mapGoal);
}

export async function getGoal(userId: string, goalId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("id", goalId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapGoal(data as GoalRow) : null;
}

export async function saveGoal(userId: string, input: GoalInput, goalId?: string) {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    title: input.title.trim(),
    description: input.description.trim(),
    life_domain: input.lifeDomain,
    goal_type: input.goalType,
    target_date: input.targetDate ?? null,
  };

  const query = goalId
    ? client.from("goals").update(payload).eq("user_id", userId).eq("id", goalId)
    : client.from("goals").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return mapGoal(data as GoalRow);
}

export async function updateGoalStatus(userId: string, goalId: string, status: GoalStatus) {
  const client = requireSupabase();
  const { error } = await client
    .from("goals")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", goalId);

  if (error) throw error;
}

export async function listMilestones(userId: string, goalId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("milestones")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as MilestoneRow[]).map(mapMilestone);
}

export async function saveMilestones(userId: string, goalId: string, inputs: MilestoneInput[]) {
  const client = requireSupabase();
  const payload = inputs.map((m) => ({
    goal_id: goalId,
    user_id: userId,
    description: m.description.trim(),
    target_date: m.targetDate ?? null,
  }));

  const { error } = await client.from("milestones").insert(payload);
  if (error) throw error;
}

export async function deleteMilestonesForGoal(userId: string, goalId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("milestones")
    .delete()
    .eq("user_id", userId)
    .eq("goal_id", goalId);

  if (error) throw error;
}

export async function completeMilestone(userId: string, milestoneId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("milestones")
    .update({ completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", milestoneId);

  if (error) throw error;
}

export async function uncompleteMilestone(userId: string, milestoneId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("milestones")
    .update({ completed_at: null })
    .eq("user_id", userId)
    .eq("id", milestoneId);

  if (error) throw error;
}
