import type {
  ExpansionLog,
  ExpansionLogInput,
  ExpansionTechnique,
  DiscomfortType,
} from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle, mutateVoid } from "./helpers";

interface ExpansionLogRow {
  id: string;
  user_id: string;
  emotion: string;
  body_sensation: string;
  intensity_before: number | null;
  struggle_switch_on: boolean | null;
  discomfort_type: string | null;
  technique_used: string;
  intensity_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapExpansionLog(row: ExpansionLogRow): ExpansionLog {
  return {
    id: row.id,
    userId: row.user_id,
    emotion: row.emotion,
    bodySensation: row.body_sensation,
    intensityBefore: row.intensity_before,
    struggleSwitchOn: row.struggle_switch_on,
    discomfortType: row.discomfort_type as DiscomfortType | null,
    techniqueUsed: row.technique_used as ExpansionTechnique,
    intensityAfter: row.intensity_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listExpansionLogs(userId: string, limit = 30) {
  return selectList<ExpansionLogRow, ExpansionLog>(
    (c) =>
      c
        .from("act_expansion_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapExpansionLog,
  );
}

export async function getExpansionLog(userId: string, logId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(logId)) return null;
  return selectMaybe<ExpansionLogRow, ExpansionLog>(
    (c) =>
      c.from("act_expansion_logs").select("*").eq("user_id", userId).eq("id", logId).maybeSingle(),
    mapExpansionLog,
  );
}

export async function saveExpansionLog(userId: string, input: ExpansionLogInput) {
  return writeSingle<ExpansionLogRow, ExpansionLog>(
    (c) =>
      c
        .from("act_expansion_logs")
        .insert({
          user_id: userId,
          emotion: sanitizeUserText(input.emotion).trim(),
          body_sensation: sanitizeUserText(input.bodySensation ?? "").trim(),
          intensity_before: input.intensityBefore ?? null,
          struggle_switch_on: input.struggleSwitchOn ?? null,
          discomfort_type: input.discomfortType ?? null,
          technique_used: input.techniqueUsed,
          intensity_after: input.intensityAfter ?? null,
          notes: sanitizeUserText(input.notes ?? "").trim(),
          ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
        })
        .select("*")
        .single(),
    mapExpansionLog,
  );
}

export async function deleteExpansionLog(userId: string, logId: string) {
  return mutateVoid((c) =>
    c.from("act_expansion_logs").delete().eq("user_id", userId).eq("id", logId),
  );
}
