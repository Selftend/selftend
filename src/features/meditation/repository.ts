import type {
  MeditationObstacleTag,
  MeditationProgramState,
  MeditationProgramStateInput,
  MeditationSession,
  MeditationSessionInput,
  StageNumber,
  StagePracticeNote,
  TmiTechnique,
} from "@/src/features/meditation/types";
import { requireSupabase } from "@/src/lib/supabase";

interface MeditationSessionRow {
  id: string;
  user_id: string;
  stage_at_session: number;
  duration_minutes: number;
  completed_at: string;
  created_at: string;
  mind_wandering_episodes: number | null;
  dullness_level: string | null;
  distraction_level: string | null;
  obstacle_tags: string[] | null;
  reflection: string | null;
  mood_after: number | null;
  technique_used: string | null;
}

interface MeditationProgramStateRow {
  user_id: string;
  current_stage: number;
  assessed_stage: number;
  milestones_reached: number[] | null;
  onboarding_completed_at: string | null;
  last_session_at: string | null;
  preferred_duration_minutes: number | null;
  preferred_time_of_day: string | null;
  created_at: string;
  updated_at: string;
}

interface StagePracticeNoteRow {
  id: string;
  user_id: string;
  stage: number;
  note: string;
  created_at: string;
  updated_at: string;
}

function clampStage(value: number | null | undefined): StageNumber {
  const n = value ?? 1;
  if (n < 1) return 1;
  if (n > 10) return 10;
  return n as StageNumber;
}

function mapSession(row: MeditationSessionRow): MeditationSession {
  return {
    id: row.id,
    userId: row.user_id,
    stageAtSession: clampStage(row.stage_at_session),
    durationMinutes: row.duration_minutes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    mindWanderingEpisodes: row.mind_wandering_episodes,
    dullnessLevel: (row.dullness_level as MeditationSession["dullnessLevel"]) ?? null,
    distractionLevel: (row.distraction_level as MeditationSession["distractionLevel"]) ?? null,
    obstacleTags: (row.obstacle_tags ?? []) as MeditationObstacleTag[],
    reflection: row.reflection ?? "",
    moodAfter: row.mood_after,
    techniqueUsed: (row.technique_used as TmiTechnique | null) ?? null,
  };
}

function mapProgramState(row: MeditationProgramStateRow): MeditationProgramState {
  return {
    userId: row.user_id,
    currentStage: clampStage(row.current_stage),
    assessedStage: clampStage(row.assessed_stage),
    milestonesReached: row.milestones_reached ?? [],
    onboardingCompletedAt: row.onboarding_completed_at,
    lastSessionAt: row.last_session_at,
    preferredDurationMinutes: row.preferred_duration_minutes,
    preferredTimeOfDay: row.preferred_time_of_day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPracticeNote(row: StagePracticeNoteRow): StagePracticeNote {
  return {
    id: row.id,
    userId: row.user_id,
    stage: clampStage(row.stage),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMeditationSessions(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MeditationSessionRow[]).map(mapSession);
}

// Exact lifetime count for hero stats — independent of the capped list query, which
// would otherwise freeze the displayed total at `limit`.
export async function countMeditationSessions(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("meditation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function getMeditationSession(userId: string, sessionId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSession(data as MeditationSessionRow);
}

export async function saveMeditationSession(userId: string, input: MeditationSessionInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .insert({
      user_id: userId,
      stage_at_session: input.stageAtSession,
      duration_minutes: input.durationMinutes,
      mind_wandering_episodes: input.mindWanderingEpisodes ?? null,
      dullness_level: input.dullnessLevel ?? null,
      distraction_level: input.distractionLevel ?? null,
      obstacle_tags: input.obstacleTags ?? [],
      reflection: input.reflection?.trim() ?? "",
      mood_after: input.moodAfter ?? null,
      technique_used: input.techniqueUsed ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSession(data as MeditationSessionRow);
}

export async function getMeditationProgramState(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_program_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProgramState(data as MeditationProgramStateRow);
}

export async function upsertMeditationProgramState(
  userId: string,
  patch: MeditationProgramStateInput,
) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (patch.currentStage !== undefined) payload.current_stage = patch.currentStage;
  if (patch.assessedStage !== undefined) payload.assessed_stage = patch.assessedStage;
  if (patch.milestonesReached !== undefined) payload.milestones_reached = patch.milestonesReached;
  if (patch.onboardingCompletedAt !== undefined)
    payload.onboarding_completed_at = patch.onboardingCompletedAt;
  if (patch.lastSessionAt !== undefined) payload.last_session_at = patch.lastSessionAt;
  if (patch.preferredDurationMinutes !== undefined)
    payload.preferred_duration_minutes = patch.preferredDurationMinutes;
  if (patch.preferredTimeOfDay !== undefined)
    payload.preferred_time_of_day = patch.preferredTimeOfDay;

  const { data, error } = await client
    .from("meditation_program_state")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return mapProgramState(data as MeditationProgramStateRow);
}

export async function listStagePracticeNotes(userId: string, stage?: number) {
  const client = requireSupabase();
  let query = client
    .from("stage_practice_notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (stage !== undefined) {
    query = query.eq("stage", stage);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as StagePracticeNoteRow[]).map(mapPracticeNote);
}

export async function saveStagePracticeNote(userId: string, stage: number, note: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("stage_practice_notes")
    .insert({ user_id: userId, stage, note })
    .select("*")
    .single();

  if (error) throw error;
  return mapPracticeNote(data as StagePracticeNoteRow);
}
