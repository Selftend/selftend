import type { WidgetPreference } from "@/src/features/home/types";
import { requireSupabase } from "@/src/lib/supabase";

interface WidgetPreferenceRow {
  id: string;
  user_id: string;
  widget_id: string;
  position: number;
  created_at: string;
}

function mapRow(row: WidgetPreferenceRow): WidgetPreference {
  return {
    id: row.id,
    userId: row.user_id,
    widgetId: row.widget_id,
    position: row.position,
    createdAt: row.created_at,
  };
}

export async function listWidgetPreferences(userId: string): Promise<WidgetPreference[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("widget_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as WidgetPreferenceRow[]).map(mapRow);
}

export async function insertWidgetPreferences(
  userId: string,
  widgetIds: string[],
  startPosition = 0,
): Promise<void> {
  if (widgetIds.length === 0) return;
  const client = requireSupabase();
  const payload = widgetIds.map((widgetId, index) => ({
    user_id: userId,
    widget_id: widgetId,
    position: startPosition + index,
  }));
  // Idempotent: ignore duplicates from concurrent seeds.
  const { error } = await client
    .from("widget_preferences")
    .upsert(payload, { onConflict: "user_id,widget_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function deleteWidgetPreference(userId: string, widgetId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("widget_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("widget_id", widgetId);
  if (error) throw error;
}

export async function updateWidgetPositions(
  userId: string,
  orderedWidgetIds: string[],
): Promise<void> {
  const client = requireSupabase();
  const payload = orderedWidgetIds.map((widgetId, index) => ({
    user_id: userId,
    widget_id: widgetId,
    position: index,
  }));
  const { error } = await client
    .from("widget_preferences")
    .upsert(payload, { onConflict: "user_id,widget_id" });
  if (error) throw error;
}
