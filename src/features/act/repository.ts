import type {
  ACTProgramState,
  ACTProgramStateInput,
  ACTPrinciple,
  ACTConcern,
  ACTLifeDomain,
  DefusionLog,
  DefusionLogInput,
  DefusionTechnique,
  ThoughtCategory,
  ExpansionLog,
  ExpansionLogInput,
  ExpansionTechnique,
  DiscomfortType,
  UrgeSurfLog,
  UrgeSurfLogInput,
  ConnectionLog,
  ConnectionLogInput,
  ConnectionTechnique,
  ObservingSelfSession,
  ObservingSelfSessionInput,
  ObservingTechnique,
  ValueEntry,
  ValueEntryInput,
  BullsEyeSnapshot,
  BullsEyeSnapshotInput,
  CommittedAction,
  CommittedActionInput,
  CommittedActionPatch,
  ActionStep,
  ActionStepInput,
  ActionStatus,
} from "@/src/features/act/types";
import { requireSupabase } from "@/src/lib/supabase";

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

interface DefusionLogRow {
  id: string;
  user_id: string;
  fused_thought: string;
  thought_category: string;
  fusion_level_before: number | null;
  technique_used: string;
  defused_version: string;
  fusion_level_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function isMissingACTSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message, hint } = error as { code?: unknown; message?: unknown; hint?: unknown };
  if (code === "PGRST205") return true;
  return [message, hint].some((v) => typeof v === "string" && v.includes("act_"));
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

function mapDefusionLog(row: DefusionLogRow): DefusionLog {
  return {
    id: row.id,
    userId: row.user_id,
    fusedThought: row.fused_thought,
    thoughtCategory: row.thought_category as ThoughtCategory,
    fusionLevelBefore: row.fusion_level_before,
    techniqueUsed: row.technique_used as DefusionTechnique,
    defusedVersion: row.defused_version,
    fusionLevelAfter: row.fusion_level_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getACTProgramState(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_program_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingACTSchemaError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return mapProgramState(data as ACTProgramStateRow);
}

export async function upsertACTProgramState(userId: string, patch: ACTProgramStateInput) {
  const client = requireSupabase();
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

  const { data, error } = await client
    .from("act_program_state")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingACTSchemaError(error)) return null;
    throw error;
  }
  return mapProgramState(data as ACTProgramStateRow);
}

export async function listDefusionLogs(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_defusion_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingACTSchemaError(error)) return [];
    throw error;
  }
  return (data as DefusionLogRow[]).map(mapDefusionLog);
}

export async function getDefusionLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_defusion_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", logId)
    .maybeSingle();

  if (error) {
    if (isMissingACTSchemaError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return mapDefusionLog(data as DefusionLogRow);
}

export async function saveDefusionLog(userId: string, input: DefusionLogInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_defusion_logs")
    .insert({
      user_id: userId,
      fused_thought: input.fusedThought.trim(),
      thought_category: input.thoughtCategory,
      fusion_level_before: input.fusionLevelBefore ?? null,
      technique_used: input.techniqueUsed,
      defused_version: input.defusedVersion?.trim() ?? "",
      fusion_level_after: input.fusionLevelAfter ?? null,
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapDefusionLog(data as DefusionLogRow);
}

export async function deleteDefusionLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_defusion_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", logId);

  if (error) throw error;
}

// ─── Expansion ────────────────────────────────────────────────────────────────

interface ExpansionLogRow {
  id: string;
  user_id: string;
  emotion: string;
  body_sensation: string;
  intensity_before: number | null;
  struggle_switch_on: boolean | null;
  discomfort_type: string | null;
  technique_used: string;
  intensity_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapExpansionLog(row: ExpansionLogRow): ExpansionLog {
  return {
    id: row.id,
    userId: row.user_id,
    emotion: row.emotion,
    bodySensation: row.body_sensation,
    intensityBefore: row.intensity_before,
    struggleSwitchOn: row.struggle_switch_on,
    discomfortType: row.discomfort_type as DiscomfortType | null,
    techniqueUsed: row.technique_used as ExpansionTechnique,
    intensityAfter: row.intensity_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listExpansionLogs(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_expansion_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as ExpansionLogRow[]).map(mapExpansionLog);
}

export async function getExpansionLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_expansion_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", logId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapExpansionLog(data as ExpansionLogRow);
}

export async function saveExpansionLog(userId: string, input: ExpansionLogInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_expansion_logs")
    .insert({
      user_id: userId,
      emotion: input.emotion.trim(),
      body_sensation: input.bodySensation?.trim() ?? "",
      intensity_before: input.intensityBefore ?? null,
      struggle_switch_on: input.struggleSwitchOn ?? null,
      discomfort_type: input.discomfortType ?? null,
      technique_used: input.techniqueUsed,
      intensity_after: input.intensityAfter ?? null,
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapExpansionLog(data as ExpansionLogRow);
}

export async function deleteExpansionLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_expansion_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", logId);

  if (error) throw error;
}

// ─── Urge Surfing ─────────────────────────────────────────────────────────────

interface UrgeSurfLogRow {
  id: string;
  user_id: string;
  urge_description: string;
  trigger: string;
  peak_intensity: number | null;
  surfing_notes: string;
  urge_acted_on: boolean;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

function mapUrgeSurfLog(row: UrgeSurfLogRow): UrgeSurfLog {
  return {
    id: row.id,
    userId: row.user_id,
    urgeDescription: row.urge_description,
    trigger: row.trigger,
    peakIntensity: row.peak_intensity,
    surfingNotes: row.surfing_notes,
    urgeActedOn: row.urge_acted_on,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUrgeSurfLogs(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_urge_surf_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as UrgeSurfLogRow[]).map(mapUrgeSurfLog);
}

export async function saveUrgeSurfLog(userId: string, input: UrgeSurfLogInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_urge_surf_logs")
    .insert({
      user_id: userId,
      urge_description: input.urgeDescription.trim(),
      trigger: input.trigger?.trim() ?? "",
      peak_intensity: input.peakIntensity ?? null,
      surfing_notes: input.surfingNotes?.trim() ?? "",
      urge_acted_on: input.urgeActedOn ?? false,
      completed_at: input.completedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapUrgeSurfLog(data as UrgeSurfLogRow);
}

export async function deleteUrgeSurfLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_urge_surf_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", logId);

  if (error) throw error;
}

// ─── Connection ───────────────────────────────────────────────────────────────

interface ConnectionLogRow {
  id: string;
  user_id: string;
  technique: string;
  activity_context: string;
  notices_from_senses: string;
  duration_minutes: number | null;
  mood_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapConnectionLog(row: ConnectionLogRow): ConnectionLog {
  return {
    id: row.id,
    userId: row.user_id,
    technique: row.technique as ConnectionTechnique,
    activityContext: row.activity_context,
    noticesFromSenses: row.notices_from_senses,
    durationMinutes: row.duration_minutes,
    moodAfter: row.mood_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listConnectionLogs(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_connection_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as ConnectionLogRow[]).map(mapConnectionLog);
}

export async function getConnectionLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_connection_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", logId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapConnectionLog(data as ConnectionLogRow);
}

export async function saveConnectionLog(userId: string, input: ConnectionLogInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_connection_logs")
    .insert({
      user_id: userId,
      technique: input.technique,
      activity_context: input.activityContext?.trim() ?? "",
      notices_from_senses: input.noticesFromSenses?.trim() ?? "",
      duration_minutes: input.durationMinutes ?? null,
      mood_after: input.moodAfter ?? null,
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapConnectionLog(data as ConnectionLogRow);
}

export async function deleteConnectionLog(userId: string, logId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_connection_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", logId);

  if (error) throw error;
}

// ─── Observing Self ───────────────────────────────────────────────────────────

interface ObservingSelfSessionRow {
  id: string;
  user_id: string;
  technique_used: string;
  what_was_observed: string;
  duration_minutes: number | null;
  mood_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapObservingSelfSession(row: ObservingSelfSessionRow): ObservingSelfSession {
  return {
    id: row.id,
    userId: row.user_id,
    techniqueUsed: row.technique_used as ObservingTechnique,
    whatWasObserved: row.what_was_observed,
    durationMinutes: row.duration_minutes,
    moodAfter: row.mood_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listObservingSelfSessions(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_observing_self_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as ObservingSelfSessionRow[]).map(mapObservingSelfSession);
}

export async function getObservingSelfSession(userId: string, sessionId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_observing_self_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapObservingSelfSession(data as ObservingSelfSessionRow);
}

export async function saveObservingSelfSession(userId: string, input: ObservingSelfSessionInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_observing_self_sessions")
    .insert({
      user_id: userId,
      technique_used: input.techniqueUsed,
      what_was_observed: input.whatWasObserved?.trim() ?? "",
      duration_minutes: input.durationMinutes ?? null,
      mood_after: input.moodAfter ?? null,
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapObservingSelfSession(data as ObservingSelfSessionRow);
}

export async function deleteObservingSelfSession(userId: string, sessionId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_observing_self_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("id", sessionId);

  if (error) throw error;
}

// ─── Values ───────────────────────────────────────────────────────────────────

interface ValueEntryRow {
  id: string;
  user_id: string;
  life_domain: string;
  value_statement: string;
  importance_rating: number | null;
  current_alignment_rating: number | null;
  current_actions_note: string;
  desired_actions_note: string;
  barriers: string;
  created_at: string;
  updated_at: string;
}

function mapValueEntry(row: ValueEntryRow): ValueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    lifeDomain: row.life_domain as ACTLifeDomain,
    valueStatement: row.value_statement,
    importanceRating: row.importance_rating,
    currentAlignmentRating: row.current_alignment_rating,
    currentActionsNote: row.current_actions_note,
    desiredActionsNote: row.desired_actions_note,
    barriers: row.barriers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listValueEntries(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_value_entries")
    .select("*")
    .eq("user_id", userId)
    .order("life_domain");

  if (error) throw error;
  return (data as ValueEntryRow[]).map(mapValueEntry);
}

export async function getValueEntryByDomain(userId: string, domain: ACTLifeDomain) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_value_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("life_domain", domain)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapValueEntry(data as ValueEntryRow);
}

export async function upsertValueEntry(userId: string, input: ValueEntryInput) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = {
    user_id: userId,
    life_domain: input.lifeDomain,
    updated_at: new Date().toISOString(),
  };
  if (input.valueStatement !== undefined) payload.value_statement = input.valueStatement.trim();
  if (input.importanceRating !== undefined) payload.importance_rating = input.importanceRating;
  if (input.currentAlignmentRating !== undefined)
    payload.current_alignment_rating = input.currentAlignmentRating;
  if (input.currentActionsNote !== undefined)
    payload.current_actions_note = input.currentActionsNote.trim();
  if (input.desiredActionsNote !== undefined)
    payload.desired_actions_note = input.desiredActionsNote.trim();
  if (input.barriers !== undefined) payload.barriers = input.barriers.trim();

  const { data, error } = await client
    .from("act_value_entries")
    .upsert(payload, { onConflict: "user_id,life_domain" })
    .select("*")
    .single();

  if (error) throw error;
  return mapValueEntry(data as ValueEntryRow);
}

// ─── Bull's-Eye Snapshots ─────────────────────────────────────────────────────

interface BullsEyeSnapshotRow {
  id: string;
  user_id: string;
  domain: string;
  alignment_rating: number;
  reviewed_at: string;
  created_at: string;
}

function mapBullsEyeSnapshot(row: BullsEyeSnapshotRow): BullsEyeSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    domain: row.domain as ACTLifeDomain,
    alignmentRating: row.alignment_rating,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export async function listBullsEyeSnapshots(userId: string, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_bulls_eye_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as BullsEyeSnapshotRow[]).map(mapBullsEyeSnapshot);
}

export async function saveBullsEyeSnapshot(userId: string, input: BullsEyeSnapshotInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_bulls_eye_snapshots")
    .insert({
      user_id: userId,
      domain: input.domain,
      alignment_rating: input.alignmentRating,
      reviewed_at: input.reviewedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapBullsEyeSnapshot(data as BullsEyeSnapshotRow);
}

// ─── Committed Action ─────────────────────────────────────────────────────────

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
  const client = requireSupabase();
  let query = client
    .from("act_committed_actions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data as CommittedActionRow[]).map(mapCommittedAction);
}

export async function getCommittedAction(userId: string, actionId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_committed_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", actionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapCommittedAction(data as CommittedActionRow);
}

export async function saveCommittedAction(userId: string, input: CommittedActionInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_committed_actions")
    .insert({
      user_id: userId,
      life_domain: input.lifeDomain,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      status: input.status ?? "active",
      target_date: input.targetDate ?? null,
      obstacles: input.obstacles?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapCommittedAction(data as CommittedActionRow);
}

export async function updateCommittedAction(
  userId: string,
  actionId: string,
  patch: CommittedActionPatch,
) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim();
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.targetDate !== undefined) payload.target_date = patch.targetDate;
  if (patch.obstacles !== undefined) payload.obstacles = patch.obstacles.trim();

  const { data, error } = await client
    .from("act_committed_actions")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", actionId)
    .select("*")
    .single();

  if (error) throw error;
  return mapCommittedAction(data as CommittedActionRow);
}

export async function deleteCommittedAction(userId: string, actionId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_committed_actions")
    .delete()
    .eq("user_id", userId)
    .eq("id", actionId);

  if (error) throw error;
}

// ─── Action Steps ─────────────────────────────────────────────────────────────

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
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_action_steps")
    .select("*")
    .eq("user_id", userId)
    .eq("action_id", actionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ActionStepRow[]).map(mapActionStep);
}

export async function saveActionStep(userId: string, input: ActionStepInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_action_steps")
    .insert({
      user_id: userId,
      action_id: input.actionId,
      description: input.description.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapActionStep(data as ActionStepRow);
}

export async function toggleActionStep(userId: string, stepId: string, completed: boolean) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_action_steps")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", stepId)
    .select("*")
    .single();

  if (error) throw error;
  return mapActionStep(data as ActionStepRow);
}

export async function deleteActionStep(userId: string, stepId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_action_steps")
    .delete()
    .eq("user_id", userId)
    .eq("id", stepId);

  if (error) throw error;
}
