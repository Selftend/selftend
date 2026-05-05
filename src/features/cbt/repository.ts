import type { ThoughtRecord, ThoughtRecordInput } from "@/src/features/cbt/types";
import { requireSupabase } from "@/src/lib/supabase";

interface ThoughtRecordRow {
  id: string;
  user_id: string;
  situation: string;
  automatic_thought: string;
  emotions: string[] | null;
  distortions: string[] | null;
  balanced_thought: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

function mapThoughtRecord(row: ThoughtRecordRow): ThoughtRecord {
  return {
    id: row.id,
    userId: row.user_id,
    situation: row.situation,
    automaticThought: row.automatic_thought,
    emotions: row.emotions ?? [],
    distortions: row.distortions ?? [],
    balancedThought: row.balanced_thought,
    createdAt: row.created_at,
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
    .order("updated_at", { ascending: false });

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
    automatic_thought: input.automaticThought.trim(),
    emotions: input.emotions,
    distortions: input.distortions,
    balanced_thought: input.balancedThought.trim(),
  };

  const query = recordId
    ? client.from("thought_records").update(payload).eq("user_id", userId).eq("id", recordId)
    : client.from("thought_records").insert(payload);

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
