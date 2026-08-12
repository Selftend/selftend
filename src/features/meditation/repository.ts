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
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";
import {
  entryDayKey,
  occurrenceTimeFromDate,
  validateOccurrenceTime,
} from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface MeditationSessionRow {
  id: string;
  user_id: string;
  stage_at_session: number;
  duration_minutes: number;
  completed_at: string;
  completed_offset_minutes?: number | null;
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
  const completedOffsetMinutes = row.completed_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    stageAtSession: clampStage(row.stage_at_session),
    durationMinutes: row.duration_minutes,
    completedAt: row.completed_at,
    completedOffsetMinutes,
    dayKey: entryDayKey(row.completed_at, completedOffsetMinutes),
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

/**
 * A page of sits, newest first.
 *
 * The ordinary recent-session read remains deliberately capped. The all-sits
 * screen uses `listMeditationSessionsPage` below with a stable cursor.
 */
export async function listMeditationSessions(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MeditationSessionRow[]).map(mapSession);
}

/** One stable page for the all-sits screen, with a total descending order. */
export async function listMeditationSessionsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  const client = requireSupabase();
  let query = client
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) query = query.or(descendingCursorFilter("completed_at", cursor));

  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return (data as MeditationSessionRow[]).map(mapSession);
}

/** Just the columns the minutes chart and insights card reduce over, plus what dates them. */
interface MeditationMinutesRow {
  duration_minutes: number;
  completed_at: string;
  completed_offset_minutes?: number | null;
  obstacle_tags?: MeditationObstacleTag[] | null;
}

/**
 * Minutes sat since an instant, for the overview's thirty-day chart.
 *
 * A query of its own rather than a slice of the list, for the reason #337 gave
 * the median its own RPC: the list is capped, so a chart reduced over it would
 * quietly stop covering its own window once a user passed the cap - and nothing
 * on the chart would say so. Bounded by date instead of by row count, it cannot.
 *
 * Four columns, not `*`: this reads every sit in a month and needs none of the
 * reflection text. `obstacle_tags` rides along for the insights card (#853),
 * which reduces over the same window the chart draws.
 */
export async function listMeditationMinutesSince(userId: string, fromIso: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .select("duration_minutes, completed_at, completed_offset_minutes, obstacle_tags")
    .eq("user_id", userId)
    .gte("completed_at", fromIso)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return (data as MeditationMinutesRow[]).map((row) => ({
    dayKey: entryDayKey(row.completed_at, row.completed_offset_minutes ?? null),
    durationMinutes: row.duration_minutes,
    obstacleTags: row.obstacle_tags ?? [],
  }));
}

// Exact lifetime count for hero stats - independent of the capped list query, which
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

// Exact lifetime median sit length for the hero stat. Taking the median client-side only
// ever covered the 200 sessions the list query loads, so it silently truncated for daily
// meditators; the RPC computes the percentile server-side and returns a single number (#337).
// Takes no argument: the RPC scopes itself to auth.uid() under the caller's own RLS.
//
// Rounding lives here rather than in SQL so the value matches what the client-side
// `median()` produced for the same data - Math.round breaks a `.5` tie upward, Postgres
// `round(double precision)` breaks it to even.
export async function medianMeditationMinutes(): Promise<number | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("meditation_median_minutes");

  if (error) throw error;
  // Null means the user has no sessions at all, which is not the same as a zero-minute
  // median - the hero renders a dash for it.
  if (data === null || data === undefined) return null;
  return Math.round(Number(data));
}

export async function getMeditationSession(userId: string, sessionId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(sessionId)) return null;
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
  // The instant AND the offset come from one reading of the clock. `completed_at`
  // used to be left to the server default, but a server-defaulted instant paired
  // with a device offset is two different clocks - at 23:59 they disagree about
  // the day, which is the exact thing the offset exists to pin down (#330).
  //
  // The caller supplies the instant when it knows one. Meditation has no
  // back-date picker, but it does have a gap: the timer stops, and the sit is
  // only saved once the reflection form is submitted, which can be much later
  // and on the other side of midnight. Reading the clock here would record the
  // save, and since the offset is now the authoritative civil day, it would
  // record it permanently. Falling back to now is right only for callers with
  // no earlier instant to offer.
  const occurrence = input.occurredAt
    ? validateOccurrenceTime(input.occurredAt)
    : occurrenceTimeFromDate();
  const { data, error } = await client
    .from("meditation_sessions")
    .insert({
      user_id: userId,
      stage_at_session: input.stageAtSession,
      duration_minutes: input.durationMinutes,
      completed_at: occurrence.occurredAt,
      completed_offset_minutes: occurrence.occurredOffsetMinutes,
      mind_wandering_episodes: input.mindWanderingEpisodes ?? null,
      dullness_level: input.dullnessLevel ?? null,
      distraction_level: input.distractionLevel ?? null,
      obstacle_tags: input.obstacleTags ?? [],
      reflection: sanitizeUserText(input.reflection ?? "").trim(),
      mood_after: input.moodAfter ?? null,
      technique_used: input.techniqueUsed ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSession(data as MeditationSessionRow);
}

/** What the post-sit reflection may change on an already-recorded sit (#786). */
export interface MeditationReflectionPatch {
  obstacleTags: MeditationObstacleTag[];
  reflection: string;
}

/**
 * Attach the optional reflection to a sit that is already saved.
 *
 * The sit row is created the moment the timer finishes (#786) - "Saved already"
 * is the screen's promise, so the reflection can only ever be an UPDATE of that
 * row, never the write that creates it. Scoped to the owner as well as the id
 * so a stale or foreign id updates nothing and surfaces as an error rather
 * than silently writing someone else's row past RLS.
 */
export async function updateMeditationSessionReflection(
  userId: string,
  sessionId: string,
  patch: MeditationReflectionPatch,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meditation_sessions")
    .update({
      obstacle_tags: patch.obstacleTags,
      reflection: sanitizeUserText(patch.reflection).trim(),
    })
    .eq("user_id", userId)
    .eq("id", sessionId)
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
