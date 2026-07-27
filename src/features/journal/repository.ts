import type { JournalEntry, JournalInput } from "@/src/features/journal/types";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface JournalEntryRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  occurred_at?: string;
  occurred_offset_minutes?: number | null;
  created_at: string;
  updated_at: string;
}

function mapJournalEntry(row: JournalEntryRow): JournalEntry {
  const occurredAt = row.occurred_at ?? row.created_at;
  const occurredOffsetMinutes = row.occurred_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    occurredAt,
    occurredOffsetMinutes,
    dayKey: entryDayKey(occurredAt, occurredOffsetMinutes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listJournalEntries(userId: string, limit = 50) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as JournalEntryRow[]).map(mapJournalEntry);
}

// Exact lifetime count for tile/hero stats - avoids fetching (and decrypting) full
// journal bodies just to display a number.
export async function countJournalEntries(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

// Exact count of entries created since `sinceIso` - for the Progress 30-day stat, so it
// doesn't fetch (and decrypt) full bodies just to count recent ones.
export async function countJournalEntriesSince(userId: string, sinceIso: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("occurred_at", sinceIso);

  if (error) throw error;
  return count ?? 0;
}

// Exact lifetime word total for the hero stat. Summing bodies client-side would only ever
// cover the 50 entries the list query loads, so the figure silently truncated for heavy
// writers; the RPC counts server-side and returns a single number (#293).
export async function sumJournalWords(): Promise<number> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("journal_word_total");

  if (error) throw error;
  // PostgREST serialises bigint as a JSON number, but coerce defensively.
  return Number(data ?? 0);
}

export async function getJournalEntry(userId: string, id: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(id)) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapJournalEntry(data as JournalEntryRow) : null;
}

function normalizeOccurredAt(occurredAt: string): string {
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid entry date");
  }
  if (parsed.getTime() > Date.now()) {
    throw new Error("Entry date cannot be in the future");
  }
  return parsed.toISOString();
}

export async function saveJournalEntry(userId: string, input: JournalInput, entryId?: string) {
  const client = requireSupabase();
  const payload = {
    title: sanitizeUserText(input.title).trim(),
    body: sanitizeUserText(input.body).trim(),
    ...((input.occurredAt ?? input.createdAt)
      ? {
          occurred_at: normalizeOccurredAt((input.occurredAt ?? input.createdAt)!),
          // `undefined` means the caller never had an opinion (quick-log paths) -
          // this device, now, is the honest answer. An explicit `null` means the
          // entry has no captured offset and must keep it, so an unrelated edit
          // cannot stamp it with wherever the user stands today (#250).
          occurred_offset_minutes:
            input.occurredOffsetMinutes === undefined
              ? -new Date((input.occurredAt ?? input.createdAt)!).getTimezoneOffset()
              : input.occurredOffsetMinutes,
        }
      : {}),
  };

  if (entryId) {
    const { data, error } = await client
      .from("journal_entries")
      .update(payload)
      .eq("user_id", userId)
      .eq("id", entryId)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Entry not found");
    return mapJournalEntry(data as JournalEntryRow);
  }

  const { data, error } = await client
    .from("journal_entries")
    .insert({
      ...payload,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapJournalEntry(data as JournalEntryRow);
}

export async function deleteJournalEntry(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("journal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw error;
}
