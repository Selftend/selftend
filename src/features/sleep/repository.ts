import type { SleepInput, SleepLog } from "@/src/features/sleep/types";
import { requireSupabase } from "@/src/lib/supabase";

interface SleepLogRow {
  id: string;
  user_id: string;
  duration_minutes: number;
  quality: number;
  notes: string;
  logged_at: string;
  created_at: string;
}

function mapSleepLog(row: SleepLogRow): SleepLog {
  return {
    id: row.id,
    userId: row.user_id,
    durationMinutes: row.duration_minutes,
    quality: row.quality,
    notes: row.notes,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

export async function listSleepLogs(userId: string, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as SleepLogRow[]).map(mapSleepLog);
}

// Exact lifetime count for hero stats — independent of the capped list query, which
// would otherwise freeze the displayed total at `limit`.
export async function countSleepLogs(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("sleep_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function getSleepLog(userId: string, id: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSleepLog(data as SleepLogRow) : null;
}

export async function saveSleepLog(userId: string, input: SleepInput, logId?: string) {
  const client = requireSupabase();
  const payload = {
    duration_minutes: input.durationMinutes,
    quality: input.quality,
    notes: input.notes.trim(),
  };

  const insertPayload: Record<string, unknown> = { ...payload, user_id: userId };
  if (!logId && input.loggedAt) insertPayload.logged_at = input.loggedAt;

  const query = logId
    ? client.from("sleep_logs").update(payload).eq("user_id", userId).eq("id", logId)
    : client.from("sleep_logs").insert(insertPayload);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Sleep log not found");
  return mapSleepLog(data as SleepLogRow);
}

export async function deleteSleepLog(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from("sleep_logs").delete().eq("user_id", userId).eq("id", id);

  if (error) throw error;
}
