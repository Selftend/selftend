import type { GratitudeEntry, GratitudeInput } from "@/src/features/gratitude/types";
import {
  GRATITUDE_EVENT_COUNT,
  GRATITUDE_ITEM_COUNT,
  GRATITUDE_ITEM_MAX,
  GRATITUDE_LIFE_ITEM_COUNT,
} from "@/src/features/gratitude/schemas";
import type { GratitudeLevel } from "@/src/features/modules/types";
import { requireSupabase } from "@/src/lib/supabase";

interface GratitudeEntryRow {
  id: string;
  user_id: string;
  level: number | null;
  item_1: string;
  item_2: string;
  item_3: string;
  item_4?: string | null;
  item_5?: string | null;
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
  starred?: boolean | null;
}

// Trim and clamp each slot, keep positions, pad/truncate to a fixed length.
// Blanks are preserved — slot index ↔ question index.
function positionalItems(items: string[], count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push((items[i] ?? "").trim().slice(0, GRATITUDE_ITEM_MAX));
  }
  return out;
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
    items: positionalItems(
      [row.item_1, row.item_2, row.item_3, row.item_4 ?? "", row.item_5 ?? ""],
      GRATITUDE_ITEM_COUNT,
    ),
    note: row.note,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: row.events ?? [],
    goodMoment: row.good_moment ?? "",
    missIfGone: row.miss_if_gone ?? "",
    hiddenGood: row.hidden_good ?? "",
    lifeItems: positionalItems(
      [row.life_item_1 ?? "", row.life_item_2 ?? "", row.life_item_3 ?? ""],
      GRATITUDE_LIFE_ITEM_COUNT,
    ),
    starred: Boolean(row.starred),
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

// Exact lifetime count for hero stats — independent of the capped list query, which
// would otherwise freeze the displayed total at `limit`.
export async function countGratitudeEntries(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("gratitude_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function listFavoriteGratitudeEntries(userId: string, limit = 100) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("gratitude_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("starred", true)
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
  const items = positionalItems(input.items, GRATITUDE_ITEM_COUNT);
  if (items.every((item) => item.length === 0)) {
    throw new Error("At least one gratitude item is required.");
  }

  const lifeItems = positionalItems(input.lifeItems ?? [], GRATITUDE_LIFE_ITEM_COUNT);
  const events = (input.events ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .slice(0, GRATITUDE_EVENT_COUNT);

  const client = requireSupabase();
  const payload = {
    level: input.level,
    item_1: items[0] ?? "",
    item_2: items[1] ?? "",
    item_3: items[2] ?? "",
    item_4: items[3] ?? "",
    item_5: items[4] ?? "",
    note: input.note.trim(),
    events,
    good_moment: (input.goodMoment ?? "").trim(),
    miss_if_gone: (input.missIfGone ?? "").trim(),
    hidden_good: (input.hiddenGood ?? "").trim(),
    life_item_1: lifeItems[0] ?? "",
    life_item_2: lifeItems[1] ?? "",
    life_item_3: lifeItems[2] ?? "",
  };

  const loggedAt = input.loggedAt ?? new Date().toISOString();

  const query = entryId
    ? client.from("gratitude_entries").update(payload).eq("user_id", userId).eq("id", entryId)
    : client.from("gratitude_entries").insert({
        ...payload,
        user_id: userId,
        logged_at: loggedAt,
      });

  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return mapGratitudeEntry(data as GratitudeEntryRow);
}

export async function setGratitudeEntryStarred(userId: string, id: string, starred: boolean) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("gratitude_entries")
    .update({ starred })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

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
