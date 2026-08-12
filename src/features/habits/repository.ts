import type {
  Habit,
  HabitColor,
  HabitInput,
  HabitKind,
  HabitLog,
  HabitCadence,
} from "@/src/features/habits/types";
import { toHabitColor } from "@/src/features/habits/schemas";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";
import { requireSupabase } from "@/src/lib/supabase";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  kind: HabitKind;
  identity: string;
  cue_plan: string;
  stack_after: string;
  craving_pairing: string;
  two_minute_version: string;
  reward_note: string;
  cadence: HabitCadence;
  custom_days: number[] | null;
  color: HabitColor;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HabitLogRow {
  id: string;
  user_id: string;
  habit_id: string;
  logged_on: string;
  note: string;
  created_at: string;
  updated_at: string;
}

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind,
    identity: row.identity,
    cuePlan: row.cue_plan,
    stackAfter: row.stack_after,
    cravingPairing: row.craving_pairing,
    twoMinuteVersion: row.two_minute_version,
    rewardNote: row.reward_note,
    cadence: row.cadence,
    customDays: row.custom_days ?? [],
    color: toHabitColor(row.color),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHabitLog(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    userId: row.user_id,
    habitId: row.habit_id,
    loggedOn: row.logged_on,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function payloadFromInput(input: HabitInput) {
  return {
    name: sanitizeUserText(input.name).trim(),
    kind: input.kind,
    identity: sanitizeUserText(input.identity).trim(),
    cue_plan: sanitizeUserText(input.cuePlan).trim(),
    stack_after: sanitizeUserText(input.stackAfter).trim(),
    craving_pairing: sanitizeUserText(input.cravingPairing).trim(),
    two_minute_version: sanitizeUserText(input.twoMinuteVersion).trim(),
    reward_note: sanitizeUserText(input.rewardNote).trim(),
    cadence: input.cadence,
    custom_days: input.cadence === "custom" ? Array.from(new Set(input.customDays)).sort() : [],
    color: input.color,
  };
}

export async function listHabits(userId: string, includeArchived = false): Promise<Habit[]> {
  const client = requireSupabase();
  let query = client
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as HabitRow[]).map(mapHabit);
}

export async function getHabit(userId: string, id: string): Promise<Habit | null> {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(id)) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapHabit(data as HabitRow) : null;
}

export async function saveHabit(
  userId: string,
  input: HabitInput,
  habitId?: string,
): Promise<Habit> {
  const client = requireSupabase();
  const payload = payloadFromInput(input);
  const query = habitId
    ? client.from("habits").update(payload).eq("user_id", userId).eq("id", habitId)
    : client.from("habits").insert({ ...payload, user_id: userId });
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Habit not found");
  return mapHabit(data as HabitRow);
}

export async function archiveHabit(userId: string, id: string): Promise<Habit> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapHabit(data as HabitRow);
}

export async function restoreHabit(userId: string, id: string): Promise<Habit> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("habits")
    .update({ archived_at: null })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapHabit(data as HabitRow);
}

export async function deleteHabit(userId: string, id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("habits").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function listHabitLogs(
  userId: string,
  options: {
    habitId?: string;
    sinceDate?: string;
    untilDate?: string;
    limit?: number;
  } = {},
): Promise<HabitLog[]> {
  // The habit detail/log screens pass the route's habitId here too; a malformed id
  // would 400 on the uuid cast, so short-circuit to the same zero-rows result.
  if (options.habitId && !isValidUuid(options.habitId)) return [];
  const client = requireSupabase();
  let query = client
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    // `logged_on` is a `date` with one row per habit per day, so it is NOT
    // unique: every habit ticked on the same day ties on it. Postgres gives no
    // stable order among ties across separate statements, so a paged read
    // ordered on it alone can hand the same row back twice - or skip it - when
    // a tied group straddles a page boundary. `id` is arbitrary but total,
    // which is all a page boundary needs.
    .order("id", { ascending: false });

  if (options.habitId) query = query.eq("habit_id", options.habitId);
  if (options.sinceDate) query = query.gte("logged_on", options.sinceDate);
  // Inclusive upper bound. The rows come back NEWEST-first, so a `sinceDate`
  // with a `limit` is a window on the most recent days, not on the oldest -
  // which means asking for one old day with `{ sinceDate: day, limit: n }`
  // returns the n newest days at or after it and omits the day itself. Closing
  // the range is the only way to ask for a specific day.
  if (options.untilDate) query = query.lte("logged_on", options.untilDate);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as HabitLogRow[]).map(mapHabitLog);
}

/** One stable page for the all-history screen, newest day and id first. */
export async function listHabitLogsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
): Promise<HabitLog[]> {
  const client = requireSupabase();
  let query = client
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) query = query.or(descendingCursorFilter("logged_on", cursor));

  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return (data as HabitLogRow[]).map(mapHabitLog);
}

export async function toggleHabitLog(
  userId: string,
  habitId: string,
  loggedOn: string,
): Promise<{ log: HabitLog | null; ticked: boolean }> {
  const client = requireSupabase();
  const { data: existing, error: lookupError } = await client
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("logged_on", loggedOn)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { error: deleteError } = await client
      .from("habit_logs")
      .delete()
      .eq("user_id", userId)
      .eq("id", (existing as HabitLogRow).id);
    if (deleteError) throw deleteError;
    return { log: null, ticked: false };
  }

  const { data: inserted, error: insertError } = await client
    .from("habit_logs")
    .insert({
      user_id: userId,
      habit_id: habitId,
      logged_on: loggedOn,
      note: "",
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return { log: mapHabitLog(inserted as HabitLogRow), ticked: true };
}

export async function upsertHabitLogNote(
  userId: string,
  habitId: string,
  loggedOn: string,
  note: string,
): Promise<HabitLog> {
  const client = requireSupabase();
  // habit_logs is a transparent encrypted view; a view cannot be the target of
  // INSERT ... ON CONFLICT, so we insert plainly and the view's INSTEAD OF trigger resolves the
  // (habit_id, logged_on) merge against the base table's real unique index.
  const { data, error } = await client
    .from("habit_logs")
    .insert({
      user_id: userId,
      habit_id: habitId,
      logged_on: loggedOn,
      note: sanitizeUserText(note).trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapHabitLog(data as HabitLogRow);
}
