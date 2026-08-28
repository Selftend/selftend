import type { UrgeSurfLog, UrgeSurfLogInput } from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle } from "./helpers";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";

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

/**
 * One page of every urge-surf log, newest first - the archive read behind `/modules/act/expansion/urge-surfing` (#1517).
 *
 * Keyset on the plaintext `created_at` rather than `.range()`: ACT rows are encrypted, so
 * ADR-0001 prices a read at `rows returned x encrypted columns`, and an offset page
 * re-reads and re-decrypts every row it skips. Ordering and filtering stay plaintext,
 * which is exactly what lets the `LIMIT` push below the decrypt.
 *
 * `id` breaks the tie so a page boundary cannot straddle two rows sharing a
 * timestamp - `created_at` is not unique.
 */
export async function listUrgeSurfLogsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<UrgeSurfLogRow, UrgeSurfLog>((c) => {
    let query = c
      .from("act_urge_surf_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapUrgeSurfLog);
}

/**
 * One urge-surf log by id — new with the detail route (#1517).
 *
 * ☠️ Urge surfing asks four questions the app never showed anyone back. The row on the
 * list renders `urgeDescription` and a timestamp; `trigger`, `peakIntensity`,
 * `urgeActedOn` and `surfingNotes` were written on every entry and read by no surface
 * at any depth. This read is what makes them reachable, and it is why urge surf is in
 * #1517's coverage at all — the missing depth was the smaller half of the defect.
 */
export async function getUrgeSurfLog(userId: string, logId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(logId)) return null;
  return selectMaybe<UrgeSurfLogRow, UrgeSurfLog>(
    (c) =>
      c.from("act_urge_surf_logs").select("*").eq("user_id", userId).eq("id", logId).maybeSingle(),
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
