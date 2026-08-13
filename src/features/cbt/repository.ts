import type {
  NegativeAutomaticThought,
  ThoughtRecord,
  ThoughtRecordInput,
} from "@/src/features/cbt/types";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { trimAndFilterEmpty } from "@/src/lib/strings";
import { requireSupabase } from "@/src/lib/supabase";
import { isValidUuid } from "@/src/utils/uuid";

interface ThoughtRecordRow {
  id: string;
  user_id: string;
  situation: string;
  nats: NegativeAutomaticThought[];
  emotions: string[] | null;
  emotion_intensity_before: number | null;
  distortions: string[] | null;
  evidence_for: string[] | null;
  evidence_against: string[] | null;
  balanced_thought: string;
  emotion_intensity_after: number | null;
  outcome_notes: string | null;
  created_at: string;
  // Optional: absent from a response served before the column existed.
  created_offset_minutes?: number | null;
  updated_at: string;
  archived_at: string | null;
}

function mapThoughtRecord(row: ThoughtRecordRow): ThoughtRecord {
  const createdOffsetMinutes = row.created_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    situation: row.situation,
    nats: row.nats ?? [],
    emotions: row.emotions ?? [],
    emotionIntensityBefore: row.emotion_intensity_before,
    distortions: row.distortions ?? [],
    evidenceFor: row.evidence_for ?? [],
    evidenceAgainst: row.evidence_against ?? [],
    balancedThought: row.balanced_thought,
    emotionIntensityAfter: row.emotion_intensity_after,
    outcomeNotes: row.outcome_notes ?? "",
    createdAt: row.created_at,
    createdOffsetMinutes,
    dayKey: entryDayKey(row.created_at, createdOffsetMinutes),
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export async function listThoughtRecords(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("thought_records")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data as ThoughtRecordRow[]).map(mapThoughtRecord);
}

// Exact count of non-archived thought records created since `sinceIso` - for the Progress
// 30-day stat, mirroring the journal and gratitude bounded-count queries.
/**
 * Exact lifetime count of the records a user still holds, matching what `listThoughtRecords`
 * shows them: archived records are excluded, because the number stands beside a row that
 * opens the record list.
 *
 * A `head` count rather than `records.length` off the 500-row list, per ADR-0001 - a
 * lifetime figure derived from a capped list truncates silently, and the count stays
 * plausible while it does. This needs no function or migration; PostgREST answers it
 * exactly under RLS, which is the `countJournalEntries` precedent.
 */
export async function countThoughtRecords(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("thought_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function countThoughtRecordsSince(userId: string, sinceIso: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("thought_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null)
    .gte("created_at", sinceIso);

  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function getThoughtRecord(userId: string, recordId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(recordId)) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("thought_records")
    .select("*")
    .eq("user_id", userId)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapThoughtRecord(data as ThoughtRecordRow) : null;
}

export async function saveThoughtRecord(
  userId: string,
  input: ThoughtRecordInput,
  recordId?: string,
) {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    situation: input.situation.trim(),
    nats: input.nats,
    emotions: input.emotions,
    emotion_intensity_before: input.emotionIntensityBefore,
    distortions: input.distortions,
    evidence_for: trimAndFilterEmpty(input.evidenceFor),
    evidence_against: trimAndFilterEmpty(input.evidenceAgainst),
    balanced_thought: input.balancedThought.trim(),
    emotion_intensity_after: input.emotionIntensityAfter,
    outcome_notes: input.outcomeNotes.trim(),
  };

  // Create mode sends the creation instant and its offset together, or neither:
  // they describe one moment, and a server-defaulted `created_at` paired with a
  // device offset is two readings of two different clocks (at 23:59 that is a
  // whole day apart). An edit sends neither, so the stored pair survives it (#330).
  const occurrence =
    input.createdAt && input.createdOffsetMinutes !== undefined
      ? { created_at: input.createdAt, created_offset_minutes: input.createdOffsetMinutes }
      : {};

  const query = recordId
    ? client.from("thought_records").update(payload).eq("user_id", userId).eq("id", recordId)
    : client.from("thought_records").insert({ ...payload, ...occurrence });

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    throw error;
  }
  // #85: maybeSingle() turns a missing/RLS-hidden update target into a clean not-found
  // instead of single()'s PGRST116; inserts always return their row.
  if (!data) throw new Error("Thought record not found");

  return mapThoughtRecord(data as ThoughtRecordRow);
}

export async function archiveThoughtRecord(userId: string, recordId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("thought_records")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", recordId);

  if (error) {
    throw error;
  }
}
