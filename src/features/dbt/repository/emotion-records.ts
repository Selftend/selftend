import type { EmotionRecord, EmotionRecordInput } from "@/src/features/dbt/types";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { isValidUuid } from "@/src/utils/uuid";
import {
  countRows,
  mutateVoid,
  optionalText,
  selectList,
  selectMaybe,
  writeSingle,
} from "./helpers";

interface EmotionRecordRow {
  id: string;
  user_id: string;
  what_happened: string;
  meaning: string | null;
  body_sensations: string | null;
  urges: string | null;
  did_and_said: string | null;
  afterwards: string | null;
  primary_emotions: string[] | null;
  secondary_emotions: string[] | null;
  created_at: string;
  created_offset_minutes: number | null;
  updated_at: string;
}

function mapEmotionRecord(row: EmotionRecordRow): EmotionRecord {
  const createdOffsetMinutes = row.created_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    whatHappened: row.what_happened,
    meaning: row.meaning ?? "",
    primaryEmotions: row.primary_emotions ?? [],
    secondaryEmotions: row.secondary_emotions ?? [],
    bodySensations: row.body_sensations ?? "",
    urges: row.urges ?? "",
    didAndSaid: row.did_and_said ?? "",
    afterwards: row.afterwards ?? "",
    createdAt: row.created_at,
    createdOffsetMinutes,
    dayKey: entryDayKey(row.created_at, createdOffsetMinutes),
    updatedAt: row.updated_at,
  };
}

/** Ids only, deduplicated, blanks dropped - the check-in's id space, customs included. */
function emotionIds(ids: string[] | undefined) {
  return Array.from(new Set((ids ?? []).map((id) => id.trim()).filter((id) => id.length > 0)));
}

export async function countEmotionRecords(userId: string) {
  return countRows((c) =>
    c
      .from("dbt_emotion_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  );
}

export async function listEmotionRecords(userId: string, limit = 30) {
  return selectList<EmotionRecordRow, EmotionRecord>(
    (c) =>
      c
        .from("dbt_emotion_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapEmotionRecord,
  );
}

export async function listEmotionRecordsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<EmotionRecordRow, EmotionRecord>((c) => {
    let query = c
      .from("dbt_emotion_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapEmotionRecord);
}

export async function getEmotionRecord(userId: string, id: string) {
  if (!isValidUuid(id)) return null;
  return selectMaybe<EmotionRecordRow, EmotionRecord>(
    (c) =>
      c.from("dbt_emotion_records").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    mapEmotionRecord,
  );
}

export async function saveEmotionRecord(userId: string, input: EmotionRecordInput) {
  return writeSingle<EmotionRecordRow, EmotionRecord>(
    (c) =>
      c
        .from("dbt_emotion_records")
        .insert({
          user_id: userId,
          what_happened: sanitizeUserText(input.whatHappened).trim(),
          meaning: optionalText(input.meaning, sanitizeUserText),
          primary_emotions: emotionIds(input.primaryEmotions),
          secondary_emotions: emotionIds(input.secondaryEmotions),
          body_sensations: optionalText(input.bodySensations, sanitizeUserText),
          urges: optionalText(input.urges, sanitizeUserText),
          did_and_said: optionalText(input.didAndSaid, sanitizeUserText),
          afterwards: optionalText(input.afterwards, sanitizeUserText),
          created_at: input.createdAt,
          created_offset_minutes: input.createdOffsetMinutes,
        })
        .select("*")
        .single(),
    mapEmotionRecord,
  );
}

export async function deleteEmotionRecord(userId: string, id: string) {
  return mutateVoid((c) =>
    c.from("dbt_emotion_records").delete().eq("user_id", userId).eq("id", id),
  );
}
