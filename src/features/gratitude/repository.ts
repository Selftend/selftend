import type { GratitudeEntry, GratitudeInput } from "@/src/features/gratitude/types";
import { requireSupabase } from "@/src/lib/supabase";

interface GratitudeEntryRow {
  id: string;
  user_id: string;
  item_1: string;
  item_2: string;
  item_3: string;
  note: string;
  logged_at: string;
  created_at: string;
  updated_at: string;
}

function normalizeItems(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function mapGratitudeEntry(row: GratitudeEntryRow): GratitudeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    items: normalizeItems([row.item_1, row.item_2, row.item_3]),
    note: row.note,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listGratitudeEntries(userId: string, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("gratitude_entries")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as GratitudeEntryRow[]).map(mapGratitudeEntry);
}

export async function getGratitudeEntry(userId: string, id: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("gratitude_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapGratitudeEntry(data as GratitudeEntryRow) : null;
}

export async function saveGratitudeEntry(userId: string, input: GratitudeInput, entryId?: string) {
  const items = normalizeItems(input.items);
  if (items.length === 0) {
    throw new Error("At least one gratitude item is required.");
  }

  const client = requireSupabase();
  const payload = {
    item_1: items[0] ?? "",
    item_2: items[1] ?? "",
    item_3: items[2] ?? "",
    note: input.note.trim(),
  };

  const query = entryId
    ? client.from("gratitude_entries").update(payload).eq("user_id", userId).eq("id", entryId)
    : client.from("gratitude_entries").insert({
        ...payload,
        user_id: userId,
      });

  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return mapGratitudeEntry(data as GratitudeEntryRow);
}

export async function deleteGratitudeEntry(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("gratitude_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw error;
}
