import type { JournalEntry, JournalInput } from "@/src/features/journal/types";
import { requireSupabase } from "@/src/lib/supabase";

interface JournalEntryRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

function mapJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
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
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as JournalEntryRow[]).map(mapJournalEntry);
}

export async function getJournalEntry(userId: string, id: string) {
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

export async function saveJournalEntry(userId: string, input: JournalInput, entryId?: string) {
  const client = requireSupabase();
  const payload = {
    title: input.title.trim(),
    body: input.body.trim(),
    ...(input.createdAt ? { created_at: input.createdAt } : {}),
  };

  const query = entryId
    ? client.from("journal_entries").update(payload).eq("user_id", userId).eq("id", entryId)
    : client.from("journal_entries").insert({
        ...payload,
        user_id: userId,
      });

  const { data, error } = await query.select("*").single();

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
