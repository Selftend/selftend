import type { ActivityInput, ActivityLog } from "@/src/features/activities/types";
import { requireSupabase } from "@/src/lib/supabase";

interface ActivityLogRow {
  id: string;
  user_id: string;
  activity_name: string;
  category: string;
  scheduled_at: string | null;
  completed_at: string | null;
  mood_before: number | null;
  mood_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapActivity(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    activityName: row.activity_name,
    category: row.category as ActivityLog["category"],
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    moodBefore: row.mood_before,
    moodAfter: row.mood_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listActivities(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data as ActivityLogRow[]).map(mapActivity);
}

export async function getActivity(userId: string, activityId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", activityId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapActivity(data as ActivityLogRow) : null;
}

export async function saveActivity(userId: string, input: ActivityInput, activityId?: string) {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    activity_name: input.activityName.trim(),
    category: input.category,
    scheduled_at: input.scheduledAt ?? null,
    mood_before: input.moodBefore ?? null,
    notes: input.notes.trim(),
  };

  const query = activityId
    ? client.from("activity_logs").update(payload).eq("user_id", userId).eq("id", activityId)
    : client.from("activity_logs").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return mapActivity(data as ActivityLogRow);
}

export async function completeActivity(userId: string, activityId: string, moodAfter: number | null) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("activity_logs")
    .update({
      completed_at: new Date().toISOString(),
      mood_after: moodAfter ?? null,
    })
    .eq("user_id", userId)
    .eq("id", activityId)
    .select("*")
    .single();

  if (error) throw error;
  return mapActivity(data as ActivityLogRow);
}
