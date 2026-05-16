import type { GratitudeEntry, GratitudeInput } from "@/src/features/gratitude/types";
import type { GratitudeLevel } from "@/src/features/modules/types";
import { requireSupabase } from "@/src/lib/supabase";

interface GratitudeEntryRow {
  id: string;
  user_id: string;
  level: number | null;
  item_1: string;
  item_2: string;
  item_3: string;
  note: string;
  logged_at: string;
  created_at: string;
  updated_at: string;
  events: string[] | null;
  good_moment: string | null;
  miss_if_gone: string | null;
  hidden_good: string | null;
  life_item_1: string | null;
  life_item_2: string | null;
  life_item_3: string | null;
}

function normalizeItems(items: string[], max = 3) {
  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, max);
}

function sanitizeLevel(value: number | null): GratitudeLevel {
  if (value === 1 || value === 2) return value;
  return 3;
}

function mapGratitudeEntry(row: GratitudeEntryRow): GratitudeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    level: sanitizeLevel(row.level),
    items: normalizeItems([row.item_1, row.item_2, row.item_3]),
    note: row.note,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: row.events ?? [],
    goodMoment: row.good_moment ?? "",
    missIfGone: row.miss_if_gone ?? "",
    hiddenGood: row.hidden_good ?? "",
    lifeItems: normalizeItems([
      row.life_item_1 ?? "",
      row.life_item_2 ?? "",
      row.life_item_3 ?? "",
    ]),
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

  const lifeItems = normalizeItems(input.lifeItems ?? []);
  const events = (input.events ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .slice(0, 3);

  const client = requireSupabase();
  const payload = {
    level: input.level,
    item_1: items[0] ?? "",
    item_2: items[1] ?? "",
    item_3: items[2] ?? "",
    note: input.note.trim(),
    events,
    good_moment: (input.goodMoment ?? "").trim(),
    miss_if_gone: (input.missIfGone ?? "").trim(),
    hidden_good: (input.hiddenGood ?? "").trim(),
    life_item_1: lifeItems[0] ?? "",
    life_item_2: lifeItems[1] ?? "",
    life_item_3: lifeItems[2] ?? "",
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
