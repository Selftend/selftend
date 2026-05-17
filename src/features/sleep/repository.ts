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

  const query = logId
    ? client.from("sleep_logs").update(payload).eq("user_id", userId).eq("id", logId)
    : client.from("sleep_logs").insert({ ...payload, user_id: userId });

  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return mapSleepLog(data as SleepLogRow);
}

export async function deleteSleepLog(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from("sleep_logs").delete().eq("user_id", userId).eq("id", id);

  if (error) throw error;
}
