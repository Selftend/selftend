import type { Judgement, JudgementInput, JudgementValence } from "@/src/features/dbt/types";
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

interface JudgementRow {
  id: string;
  user_id: string;
  judgement: string;
  restatement: string | null;
  valence: string;
  created_at: string;
  created_offset_minutes: number | null;
  updated_at: string;
}

function mapJudgement(row: JudgementRow): Judgement {
  const createdOffsetMinutes = row.created_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    judgement: row.judgement,
    restatement: row.restatement ?? "",
    valence: row.valence as JudgementValence,
    createdAt: row.created_at,
    createdOffsetMinutes,
    dayKey: entryDayKey(row.created_at, createdOffsetMinutes),
    updatedAt: row.updated_at,
  };
}

export async function countJudgements(userId: string) {
  return countRows((c) =>
    c.from("dbt_judgements").select("id", { count: "exact", head: true }).eq("user_id", userId),
  );
}

export async function listJudgements(userId: string, limit = 30) {
  return selectList<JudgementRow, Judgement>(
    (c) =>
      c
        .from("dbt_judgements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapJudgement,
  );
}

export async function listJudgementsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<JudgementRow, Judgement>((c) => {
    let query = c
      .from("dbt_judgements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapJudgement);
}

export async function getJudgement(userId: string, id: string) {
  if (!isValidUuid(id)) return null;
  return selectMaybe<JudgementRow, Judgement>(
    (c) => c.from("dbt_judgements").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    mapJudgement,
  );
}

export async function saveJudgement(userId: string, input: JudgementInput) {
  return writeSingle<JudgementRow, Judgement>(
    (c) =>
      c
        .from("dbt_judgements")
        .insert({
          user_id: userId,
          judgement: sanitizeUserText(input.judgement).trim(),
          restatement: optionalText(input.restatement, sanitizeUserText),
          valence: input.valence,
          created_at: input.createdAt,
          created_offset_minutes: input.createdOffsetMinutes,
        })
        .select("*")
        .single(),
    mapJudgement,
  );
}

export async function deleteJudgement(userId: string, id: string) {
  return mutateVoid((c) => c.from("dbt_judgements").delete().eq("user_id", userId).eq("id", id));
}
