import type {
  DefusionLog,
  DefusionLogInput,
  DefusionTechnique,
  ThoughtCategory,
} from "@/src/features/act/types";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import {
  countRows,
  degradeMissingSchema,
  mutateVoid,
  selectList,
  selectMaybe,
  writeSingle,
} from "./helpers";

interface DefusionLogRow {
  id: string;
  user_id: string;
  fused_thought: string;
  thought_category: string;
  fusion_level_before: number | null;
  technique_used: string;
  defused_version: string;
  fusion_level_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapDefusionLog(row: DefusionLogRow): DefusionLog {
  return {
    id: row.id,
    userId: row.user_id,
    fusedThought: row.fused_thought,
    thoughtCategory: row.thought_category as ThoughtCategory,
    fusionLevelBefore: row.fusion_level_before,
    techniqueUsed: row.technique_used as DefusionTechnique,
    defusedVersion: row.defused_version,
    fusionLevelAfter: row.fusion_level_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function getLatestDefusionLogAt(userId: string) {
  return degradeMissingSchema(
    () => fetchLatestActivity({ table: "act_defusion_logs", userId, column: "created_at" }),
    null,
  );
}

/** Every thought this user has ever unhooked from, for ACT home's second stat (#1378). */
export async function countDefusionLogs(userId: string) {
  return countRows((c) =>
    c.from("act_defusion_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
  );
}

export async function listDefusionLogs(userId: string, limit = 30) {
  return selectList<DefusionLogRow, DefusionLog>(
    (c) =>
      c
        .from("act_defusion_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapDefusionLog,
  );
}

export async function getDefusionLog(userId: string, logId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(logId)) return null;
  return selectMaybe<DefusionLogRow, DefusionLog>(
    (c) =>
      c.from("act_defusion_logs").select("*").eq("user_id", userId).eq("id", logId).maybeSingle(),
    mapDefusionLog,
  );
}

export async function saveDefusionLog(userId: string, input: DefusionLogInput) {
  return writeSingle<DefusionLogRow, DefusionLog>(
    (c) =>
      c
        .from("act_defusion_logs")
        .insert({
          user_id: userId,
          fused_thought: sanitizeUserText(input.fusedThought).trim(),
          thought_category: input.thoughtCategory,
          fusion_level_before: input.fusionLevelBefore ?? null,
          technique_used: input.techniqueUsed,
          defused_version: sanitizeUserText(input.defusedVersion ?? "").trim(),
          fusion_level_after: input.fusionLevelAfter ?? null,
          notes: sanitizeUserText(input.notes ?? "").trim(),
          ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
        })
        .select("*")
        .single(),
    mapDefusionLog,
  );
}

export async function deleteDefusionLog(userId: string, logId: string) {
  return mutateVoid((c) =>
    c.from("act_defusion_logs").delete().eq("user_id", userId).eq("id", logId),
  );
}
