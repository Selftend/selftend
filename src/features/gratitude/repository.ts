import type { GratitudeEntry, GratitudeInput } from "@/src/features/gratitude/types";
import {
  GRATITUDE_EVENT_COUNT,
  GRATITUDE_ITEM_COUNT,
  GRATITUDE_ITEM_MAX,
  GRATITUDE_LIFE_ITEM_COUNT,
} from "@/src/features/gratitude/schemas";
import type { GratitudeLevel } from "@/src/features/modules/types";
import { requireSupabase } from "@/src/lib/supabase";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

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
  logged_offset_minutes?: number;
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
// Blanks are preserved - slot index ↔ question index. Pure positioning only:
// sanitizing is a WRITE-path concern (sanitizeWriteItems below); this also runs
// on READ (mapGratitudeEntry), which must never rewrite stored text.
function positionalItems(items: string[], count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push((items[i] ?? "").trim().slice(0, GRATITUDE_ITEM_MAX));
  }
  return out;
}

// Write-path sanitize, applied AFTER the slice above: slicing after sanitizing
// could cut an emoji pair at the length boundary and reintroduce exactly the
// unpaired surrogate sanitizeUserText exists to remove (a failed insert).
function sanitizeWriteItems(items: string[]): string[] {
  return items.map((item) => sanitizeUserText(item).trim());
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
    loggedOffsetMinutes: row.logged_offset_minutes ?? 0,
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

// Exact lifetime count for hero stats - independent of the capped list query, which
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

// Exact count of entries logged since `sinceIso` - for the Progress 30-day stat.
export async function countGratitudeEntriesSince(
  userId: string,
  sinceIso: string,
): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("gratitude_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("logged_at", sinceIso);

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
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(id)) return null;
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
  const items = sanitizeWriteItems(positionalItems(input.items, GRATITUDE_ITEM_COUNT));
  if (items.every((item) => item.length === 0)) {
    throw new Error("At least one gratitude item is required.");
  }

  const lifeItems = sanitizeWriteItems(
    positionalItems(input.lifeItems ?? [], GRATITUDE_LIFE_ITEM_COUNT),
  );
  const events = (input.events ?? [])
    .map((e) => sanitizeUserText(e).trim())
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
    note: sanitizeUserText(input.note).trim(),
    events,
    good_moment: sanitizeUserText(input.goodMoment ?? "").trim(),
    miss_if_gone: sanitizeUserText(input.missIfGone ?? "").trim(),
    hidden_good: sanitizeUserText(input.hiddenGood ?? "").trim(),
    life_item_1: lifeItems[0] ?? "",
    life_item_2: lifeItems[1] ?? "",
    life_item_3: lifeItems[2] ?? "",
    ...(input.loggedAt
      ? {
          logged_at: input.loggedAt,
          logged_offset_minutes:
            input.loggedOffsetMinutes ?? -new Date(input.loggedAt).getTimezoneOffset(),
        }
      : {}),
  };

  const query = entryId
    ? client.from("gratitude_entries").update(payload).eq("user_id", userId).eq("id", entryId)
    : client.from("gratitude_entries").insert({
        ...payload,
        user_id: userId,
      });

  const { data, error } = await query.select("*").maybeSingle();

  if (error) throw error;
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Gratitude entry not found");
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
