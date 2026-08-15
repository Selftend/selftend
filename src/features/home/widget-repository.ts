import type { WidgetPreference } from "@/src/features/home/types";
import { isMissingColumnError, requireSupabase } from "@/src/lib/supabase";

interface WidgetPreferenceRow {
  id: string;
  user_id: string;
  widget_id: string;
  position: number;
  created_at: string;
}

function mapWidgetPreference(row: WidgetPreferenceRow): WidgetPreference {
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
    // `position` is server-assigned and every server writer keeps it distinct (#974), but
    // it is not constrained UNIQUE and RLS still lets a client write it directly - a
    // pre-v0.14 build does exactly that. So a duplicate can arrive from outside the write
    // functions, and two rows sharing a position have NO defined order: the list would
    // reshuffle between reads with no write in between (#986).
    //
    // These three keys are the same ordering `normalize_widget_positions()` heals into,
    // which is what makes the repair invisible - the read already showed the order the
    // heal makes durable. This is not the #974 race coming back: that race was a racy
    // WRITER, and it is dead. This is the read declining to depend on an invariant the
    // database does not enforce.
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("widget_id", { ascending: true });
  if (error) throw error;
  return (data as WidgetPreferenceRow[]).map(mapWidgetPreference);
}

// Whether this user's Home defaults have already been seeded. Used to keep an emptied
// Home empty instead of re-seeding. Degrades to false ONLY if the column is missing
// (pre-migration); any other error (network, auth, RLS) rethrows so the caller retries
// instead of mis-reading it as "never seeded" and resurrecting deliberately-removed widgets.
export async function getWidgetsSeeded(userId: string): Promise<boolean> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .select("widgets_seeded")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingColumnError(error)) return false;
    throw error;
  }
  return Boolean((data as { widgets_seeded?: boolean } | null)?.widgets_seeded);
}

// Best-effort marker that seeding has run; ignores failures (e.g. column missing pre-migration).
export async function markWidgetsSeeded(userId: string): Promise<void> {
  const client = requireSupabase();
  await client
    .from("user_preferences")
    .upsert({ user_id: userId, widgets_seeded: true }, { onConflict: "user_id" });
}

// Append one widget to the end of the caller's dashboard. The server computes the
// position, so no caller can reintroduce the read-then-write race; idempotent, so a
// double tap is not an error. `user_id` comes from `auth.uid()` inside the function.
export async function addWidgetPreference(widgetId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("add_widget_preference", { p_widget_id: widgetId });
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

// Undo a removal, putting the widget back at `position` - an index into the ordered id
// list, not a stored `position` value.
//
// This still reads before it writes, and that read is not the race #974 removed: it
// resolves an *order*, not a position, and the positions themselves stay server-assigned
// throughout. Restoring by an index captured from a rendered (filtered) array is the
// separate defect tracked as #964, and it is fixed in a later slice, not here.
export async function restoreWidgetPreference(
  userId: string,
  widgetId: string,
  position: number,
): Promise<void> {
  const current = await listWidgetPreferences(userId);
  const orderedWidgetIds = current
    .map((preference) => preference.widgetId)
    .filter((currentWidgetId) => currentWidgetId !== widgetId);
  const restoredPosition = Math.max(0, Math.min(position, orderedWidgetIds.length));
  orderedWidgetIds.splice(restoredPosition, 0, widgetId);

  // Re-add at the tail (server-assigned, so it cannot collide with a position already in
  // use), then order the full list. Because every id is named, `setWidgetOrder` has every
  // position to hand out and the restored row lands exactly where `position` asked.
  await addWidgetPreference(widgetId);
  await setWidgetOrder(orderedWidgetIds);
}

// Reorder by handing the named ids the positions they already hold, in this order. Rows
// not named keep their positions, so a caller holding a filtered view of the list cannot
// disturb the rows it cannot see.
export async function setWidgetOrder(orderedWidgetIds: string[]): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("set_widget_order", { p_widget_ids: orderedWidgetIds });
  if (error) throw error;
}
