import type { SteppableToolId } from "@/src/features/routines/derive";
import type {
  Routine,
  RoutineInput,
  RoutineStep,
  RoutineUpdate,
  RoutineWithSteps,
} from "@/src/features/routines/types";
import { requireSupabase } from "@/src/lib/supabase";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { isValidUuid } from "@/src/utils/uuid";

// `routines` is the decrypting view over routines_data: name goes up in
// plaintext and is encrypted server-side by the view's INSTEAD OF triggers.
// `routine_steps` is a plain table (tool_id is an app identifier).

interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  reminder_enabled: boolean;
  reminder_hour: number | null;
  reminder_minute: number | null;
  reminder_timezone: string | null;
  created_at: string;
  updated_at: string;
}

interface RoutineStepRow {
  id: string;
  routine_id: string;
  user_id: string;
  tool_id: SteppableToolId;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    reminderEnabled: row.reminder_enabled,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    reminderTimezone: row.reminder_timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutineStep(row: RoutineStepRow): RoutineStep {
  return {
    id: row.id,
    routineId: row.routine_id,
    userId: row.user_id,
    toolId: row.tool_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Build the snake_case write payload from the supplied camelCase fields only,
// so a partial update leaves omitted columns untouched (the view's INSTEAD OF
// UPDATE trigger carries the existing values for columns not in the payload).
function payloadFromInput(input: RoutineUpdate) {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = sanitizeUserText(input.name).trim();
  if (input.reminderEnabled !== undefined) payload.reminder_enabled = input.reminderEnabled;
  if (input.reminderHour !== undefined) payload.reminder_hour = input.reminderHour;
  if (input.reminderMinute !== undefined) payload.reminder_minute = input.reminderMinute;
  if (input.reminderTimezone !== undefined) payload.reminder_timezone = input.reminderTimezone;
  return payload;
}

async function listSteps(userId: string, routineId?: string): Promise<RoutineStep[]> {
  const client = requireSupabase();
  let query = client
    .from("routine_steps")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (routineId) query = query.eq("routine_id", routineId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as RoutineStepRow[]).map(mapRoutineStep);
}

export async function listRoutinesWithSteps(userId: string): Promise<RoutineWithSteps[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("routines")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const routines = (data as RoutineRow[]).map(mapRoutine);
  if (routines.length === 0) return [];

  // One steps query for the whole list (steps arrive position-ordered), then
  // group client-side - the same compose-two-queries shape habits uses for logs.
  const steps = await listSteps(userId);
  const byRoutine = new Map<string, RoutineStep[]>();
  for (const step of steps) {
    const bucket = byRoutine.get(step.routineId);
    if (bucket) bucket.push(step);
    else byRoutine.set(step.routineId, [step]);
  }
  return routines.map((routine) => ({ ...routine, steps: byRoutine.get(routine.id) ?? [] }));
}

export async function getRoutine(userId: string, id: string): Promise<RoutineWithSteps | null> {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(id)) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("routines")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const steps = await listSteps(userId, id);
  return { ...mapRoutine(data as RoutineRow), steps };
}

export async function createRoutine(userId: string, input: RoutineInput): Promise<Routine> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("routines")
    .insert({ ...payloadFromInput(input), user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return mapRoutine(data as RoutineRow);
}

export async function updateRoutine(
  userId: string,
  id: string,
  patch: RoutineUpdate,
): Promise<Routine> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("routines")
    .update(payloadFromInput(patch))
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  // maybeSingle() turns a missing/RLS-hidden update target into a clean
  // not-found instead of single()'s PGRST116 (same trade as habits, #85).
  if (!data) throw new Error("Routine not found");
  return mapRoutine(data as RoutineRow);
}

export async function deleteRoutine(userId: string, id: string): Promise<void> {
  const client = requireSupabase();
  // Deleting through the view removes the base row; steps cascade in the DB.
  const { error } = await client.from("routines").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function addStep(
  userId: string,
  routineId: string,
  toolId: SteppableToolId,
  position: number,
): Promise<RoutineStep> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("routine_steps")
    .insert({ user_id: userId, routine_id: routineId, tool_id: toolId, position })
    .select("*")
    .single();

  if (error) throw error;
  return mapRoutineStep(data as RoutineStepRow);
}

export async function removeStep(userId: string, stepId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("routine_steps")
    .delete()
    .eq("user_id", userId)
    .eq("id", stepId);
  if (error) throw error;
}

/**
 * Persist positions for an ordered array of step ids: each step's `position`
 * becomes its index. Sequential scoped updates (user_id + routine_id + id) -
 * simple and RLS-safe; step counts are small so N round trips is fine.
 */
export async function reorderSteps(
  userId: string,
  routineId: string,
  orderedStepIds: string[],
): Promise<void> {
  if (orderedStepIds.length === 0) return;
  const client = requireSupabase();
  for (const [index, stepId] of orderedStepIds.entries()) {
    const { data, error } = await client
      .from("routine_steps")
      .update({ position: index })
      .eq("user_id", userId)
      .eq("routine_id", routineId)
      .eq("id", stepId)
      .select("id");
    if (error) throw error;
    // A zero-row match (stale id, or a step of another routine) is a silent
    // no-op at the PostgREST layer - surface it instead of "saving" a gapped
    // or duplicated order the caller believes persisted.
    if (!data || data.length === 0) throw new Error("Routine step not found");
  }
}
