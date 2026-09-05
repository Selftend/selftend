import type {
  Script,
  ScriptDoneInput,
  ScriptInput,
  ScriptWantChanged,
} from "@/src/features/dbt/types";
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

interface ScriptRow {
  id: string;
  user_id: string;
  situation: string;
  want_changed: string | null;
  i_think: string;
  emotion: string | null;
  i_feel: string | null;
  i_want: string;
  self_care: string | null;
  difficulty: number | null;
  when_where: string | null;
  how_it_went: string | null;
  created_at: string;
  created_offset_minutes: number | null;
  done_at: string | null;
  done_offset_minutes: number | null;
  updated_at: string;
}

function mapScript(row: ScriptRow): Script {
  const createdOffsetMinutes = row.created_offset_minutes ?? null;
  const doneOffsetMinutes = row.done_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    situation: row.situation,
    wantChanged: (row.want_changed as ScriptWantChanged | null) ?? null,
    iThink: row.i_think,
    emotion: row.emotion ?? null,
    iFeel: row.i_feel ?? "",
    iWant: row.i_want,
    selfCare: row.self_care ?? "",
    difficulty: row.difficulty ?? null,
    whenWhere: row.when_where ?? "",
    howItWent: row.how_it_went ?? "",
    createdAt: row.created_at,
    createdOffsetMinutes,
    dayKey: entryDayKey(row.created_at, createdOffsetMinutes),
    doneAt: row.done_at,
    doneOffsetMinutes,
    doneDayKey: row.done_at ? entryDayKey(row.done_at, doneOffsetMinutes) : null,
    updatedAt: row.updated_at,
  };
}

/**
 * The list IS the ladder (#1989): open scripts first, rated ones easiest-first,
 * unrated after them newest-first; done scripts below by done-day. Pure, so the
 * screen and its test share one ordering.
 */
export function orderScriptsAsLadder(scripts: Script[]): Script[] {
  const open = scripts.filter((script) => !script.doneAt);
  const done = scripts.filter((script) => script.doneAt);
  const rated = open
    .filter((script) => script.difficulty !== null)
    .sort((a, b) => a.difficulty! - b.difficulty! || b.createdAt.localeCompare(a.createdAt));
  const unrated = open
    .filter((script) => script.difficulty === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const finished = done.sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
  return [...rated, ...unrated, ...finished];
}

export async function countScripts(userId: string) {
  return countRows((c) =>
    c.from("dbt_scripts").select("id", { count: "exact", head: true }).eq("user_id", userId),
  );
}

export async function listScripts(userId: string, limit = 50) {
  return selectList<ScriptRow, Script>(
    (c) =>
      c
        .from("dbt_scripts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapScript,
  );
}

export async function listScriptsPage(userId: string, limit: number, cursor: RecordCursor | null) {
  return selectList<ScriptRow, Script>((c) => {
    let query = c
      .from("dbt_scripts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapScript);
}

export async function getScript(userId: string, id: string) {
  if (!isValidUuid(id)) return null;
  return selectMaybe<ScriptRow, Script>(
    (c) => c.from("dbt_scripts").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    mapScript,
  );
}

export async function saveScript(userId: string, input: ScriptInput) {
  return writeSingle<ScriptRow, Script>(
    (c) =>
      c
        .from("dbt_scripts")
        .insert({
          user_id: userId,
          situation: sanitizeUserText(input.situation).trim(),
          want_changed: input.wantChanged ?? null,
          i_think: sanitizeUserText(input.iThink).trim(),
          emotion: input.emotion?.trim() || null,
          i_feel: optionalText(input.iFeel, sanitizeUserText),
          i_want: sanitizeUserText(input.iWant).trim(),
          self_care: optionalText(input.selfCare, sanitizeUserText),
          difficulty: input.difficulty ?? null,
          when_where: optionalText(input.whenWhere, sanitizeUserText),
          created_at: input.createdAt,
          created_offset_minutes: input.createdOffsetMinutes,
        })
        .select("*")
        .single(),
    mapScript,
  );
}

/** Done from the card - the one UPDATE a script takes (#1992 §3). */
export async function markScriptDone(userId: string, id: string, input: ScriptDoneInput) {
  return writeSingle<ScriptRow, Script>(
    (c) =>
      c
        .from("dbt_scripts")
        .update({
          done_at: input.doneAt,
          done_offset_minutes: input.doneOffsetMinutes,
          how_it_went: optionalText(input.howItWent, sanitizeUserText),
        })
        .eq("user_id", userId)
        .eq("id", id)
        .select("*")
        .single(),
    mapScript,
  );
}

export async function deleteScript(userId: string, id: string) {
  return mutateVoid((c) => c.from("dbt_scripts").delete().eq("user_id", userId).eq("id", id));
}
