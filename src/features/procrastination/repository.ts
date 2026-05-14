import type {
  ProcrastinationTask,
  ProcrastinationTaskInput,
  TaskStatus,
  TaskStep,
  TaskStepInput,
} from "@/src/features/procrastination/types";
import { requireSupabase } from "@/src/lib/supabase";

interface TaskRow {
  id: string;
  user_id: string;
  task_description: string;
  avoidance_reason: string;
  fear_thought: string;
  challenged_thought: string;
  deadline: string | null;
  reward: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface StepRow {
  id: string;
  task_id: string;
  user_id: string;
  description: string;
  estimated_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapTask(row: TaskRow): ProcrastinationTask {
  return {
    id: row.id,
    userId: row.user_id,
    taskDescription: row.task_description,
    avoidanceReason: row.avoidance_reason,
    fearThought: row.fear_thought,
    challengedThought: row.challenged_thought,
    deadline: row.deadline,
    reward: row.reward,
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStep(row: StepRow): TaskStep {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    description: row.description,
    estimatedMinutes: row.estimated_minutes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTasks(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("procrastination_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TaskRow[]).map(mapTask);
}

export async function getTask(userId: string, taskId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("procrastination_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapTask(data as TaskRow) : null;
}

export async function saveTask(userId: string, input: ProcrastinationTaskInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("procrastination_tasks")
    .insert({
      user_id: userId,
      task_description: input.taskDescription.trim(),
      avoidance_reason: input.avoidanceReason.trim(),
      fear_thought: input.fearThought.trim(),
      challenged_thought: input.challengedThought.trim(),
      deadline: input.deadline ?? null,
      reward: input.reward.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapTask(data as TaskRow);
}

export async function updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
  const client = requireSupabase();
  const { error } = await client
    .from("procrastination_tasks")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", taskId);

  if (error) throw error;
}

export async function listSteps(userId: string, taskId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("task_steps")
    .select("*")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as StepRow[]).map(mapStep);
}

export async function saveSteps(userId: string, taskId: string, inputs: TaskStepInput[]) {
  const client = requireSupabase();
  const payload = inputs.map((s) => ({
    task_id: taskId,
    user_id: userId,
    description: s.description.trim(),
    estimated_minutes: s.estimatedMinutes ?? null,
  }));

  const { error } = await client.from("task_steps").insert(payload);
  if (error) throw error;
}

export async function toggleStepComplete(userId: string, stepId: string, completed: boolean) {
  const client = requireSupabase();
  const { error } = await client
    .from("task_steps")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("user_id", userId)
    .eq("id", stepId);

  if (error) throw error;
}
