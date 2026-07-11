import type { UrgeSurfLog, UrgeSurfLogInput } from "@/src/features/act/types";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, writeSingle } from "./helpers";

interface UrgeSurfLogRow {
  id: string;
  user_id: string;
  urge_description: string;
  trigger: string;
  peak_intensity: number | null;
  surfing_notes: string;
  urge_acted_on: boolean;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

function mapUrgeSurfLog(row: UrgeSurfLogRow): UrgeSurfLog {
  return {
    id: row.id,
    userId: row.user_id,
    urgeDescription: row.urge_description,
    trigger: row.trigger,
    peakIntensity: row.peak_intensity,
    surfingNotes: row.surfing_notes,
    urgeActedOn: row.urge_acted_on,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUrgeSurfLogs(userId: string, limit = 30) {
  return selectList<UrgeSurfLogRow, UrgeSurfLog>(
    (c) =>
      c
        .from("act_urge_surf_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapUrgeSurfLog,
  );
}

export async function saveUrgeSurfLog(userId: string, input: UrgeSurfLogInput) {
  return writeSingle<UrgeSurfLogRow, UrgeSurfLog>(
    (c) =>
      c
        .from("act_urge_surf_logs")
        .insert({
          user_id: userId,
          urge_description: sanitizeUserText(input.urgeDescription).trim(),
          trigger: sanitizeUserText(input.trigger ?? "").trim(),
          peak_intensity: input.peakIntensity ?? null,
          surfing_notes: sanitizeUserText(input.surfingNotes ?? "").trim(),
          urge_acted_on: input.urgeActedOn ?? false,
          completed_at: input.completedAt ?? new Date().toISOString(),
          ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
        })
        .select("*")
        .single(),
    mapUrgeSurfLog,
  );
}
