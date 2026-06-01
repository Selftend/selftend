import type {
  NegativeAutomaticThought,
  ThoughtRecord,
  ThoughtRecordInput,
} from "@/src/features/cbt/types";
import { requireSupabase } from "@/src/lib/supabase";

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
  updated_at: string;
  archived_at: string | null;
}

function mapThoughtRecord(row: ThoughtRecordRow): ThoughtRecord {
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
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
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

export async function getThoughtRecord(userId: string, recordId: string) {
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
    evidence_for: cleanList(input.evidenceFor),
    evidence_against: cleanList(input.evidenceAgainst),
    balanced_thought: input.balancedThought.trim(),
    emotion_intensity_after: input.emotionIntensityAfter,
    outcome_notes: input.outcomeNotes.trim(),
  };

  const query = recordId
    ? client.from("thought_records").update(payload).eq("user_id", userId).eq("id", recordId)
    : client
        .from("thought_records")
        .insert(input.createdAt ? { ...payload, created_at: input.createdAt } : payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

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
