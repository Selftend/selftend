import type { WiseMindCheckin, WiseMindCheckinInput } from "@/src/features/dbt/types";
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

interface WiseMindCheckinRow {
  id: string;
  user_id: string;
  question: string;
  emotion_mind: string | null;
  reason: string | null;
  wise_mind: string | null;
  created_at: string;
  created_offset_minutes: number | null;
  updated_at: string;
}

function mapWiseMindCheckin(row: WiseMindCheckinRow): WiseMindCheckin {
  const createdOffsetMinutes = row.created_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    question: row.question,
    emotionMind: row.emotion_mind ?? "",
    reason: row.reason ?? "",
    wiseMind: row.wise_mind ?? "",
    createdAt: row.created_at,
    createdOffsetMinutes,
    dayKey: entryDayKey(row.created_at, createdOffsetMinutes),
    updatedAt: row.updated_at,
  };
}

export async function countWiseMindCheckins(userId: string) {
  return countRows((c) =>
    c
      .from("dbt_wise_mind_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  );
}

export async function listWiseMindCheckins(userId: string, limit = 30) {
  return selectList<WiseMindCheckinRow, WiseMindCheckin>(
    (c) =>
      c
        .from("dbt_wise_mind_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapWiseMindCheckin,
  );
}

/** One page of the history, newest first - keyset on the plaintext `created_at`, tie-broken by `id`. */
export async function listWiseMindCheckinsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<WiseMindCheckinRow, WiseMindCheckin>((c) => {
    let query = c
      .from("dbt_wise_mind_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapWiseMindCheckin);
}

export async function getWiseMindCheckin(userId: string, id: string) {
  if (!isValidUuid(id)) return null;
  return selectMaybe<WiseMindCheckinRow, WiseMindCheckin>(
    (c) =>
      c.from("dbt_wise_mind_checkins").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    mapWiseMindCheckin,
  );
}

export async function saveWiseMindCheckin(userId: string, input: WiseMindCheckinInput) {
  return writeSingle<WiseMindCheckinRow, WiseMindCheckin>(
    (c) =>
      c
        .from("dbt_wise_mind_checkins")
        .insert({
          user_id: userId,
          question: sanitizeUserText(input.question).trim(),
          emotion_mind: optionalText(input.emotionMind, sanitizeUserText),
          reason: optionalText(input.reason, sanitizeUserText),
          wise_mind: optionalText(input.wiseMind, sanitizeUserText),
          created_at: input.createdAt,
          created_offset_minutes: input.createdOffsetMinutes,
        })
        .select("*")
        .single(),
    mapWiseMindCheckin,
  );
}

export async function deleteWiseMindCheckin(userId: string, id: string) {
  return mutateVoid((c) =>
    c.from("dbt_wise_mind_checkins").delete().eq("user_id", userId).eq("id", id),
  );
}
