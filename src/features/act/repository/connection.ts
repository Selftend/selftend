import type {
  ConnectionLog,
  ConnectionLogInput,
  ConnectionTechnique,
} from "@/src/features/act/types";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { degradeMissingSchema, mutateVoid, selectList, selectMaybe, writeSingle } from "./helpers";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";

interface ConnectionLogRow {
  id: string;
  user_id: string;
  technique: string;
  activity_context: string;
  notices_from_senses: string;
  duration_minutes: number | null;
  mood_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapConnectionLog(row: ConnectionLogRow): ConnectionLog {
  return {
    id: row.id,
    userId: row.user_id,
    technique: row.technique as ConnectionTechnique,
    activityContext: row.activity_context,
    noticesFromSenses: row.notices_from_senses,
    durationMinutes: row.duration_minutes,
    moodAfter: row.mood_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * When the user last used a connection technique, for Home's `Last {{when}}` row (#990).
 *
 * `technique` is a plaintext pass-through column on the base table, so filtering on it
 * keeps the LIMIT below the decrypt (ADR-0001). Filtering in SQL also fixes the cap the
 * row's client-side filter documented and accepted: a user with 30 newer connection logs
 * of other techniques read as having never dropped anchor.
 */
export function getLatestConnectionLogAt(userId: string, technique: ConnectionTechnique) {
  return degradeMissingSchema(
    () =>
      fetchLatestActivity({
        table: "act_connection_logs",
        userId,
        column: "created_at",
        match: { technique },
      }),
    null,
  );
}

export async function listConnectionLogs(userId: string, limit = 30) {
  return selectList<ConnectionLogRow, ConnectionLog>(
    (c) =>
      c
        .from("act_connection_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapConnectionLog,
  );
}

/**
 * One page of every connection log, newest first - the archive read behind `/modules/act/connection` (#1517).
 *
 * Keyset on the plaintext `created_at` rather than `.range()`: ACT rows are encrypted, so
 * ADR-0001 prices a read at `rows returned x encrypted columns`, and an offset page
 * re-reads and re-decrypts every row it skips. Ordering and filtering stay plaintext,
 * which is exactly what lets the `LIMIT` push below the decrypt.
 *
 * `id` breaks the tie so a page boundary cannot straddle two rows sharing a
 * timestamp - `created_at` is not unique.
 */
export async function listConnectionLogsPage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<ConnectionLogRow, ConnectionLog>((c) => {
    let query = c
      .from("act_connection_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapConnectionLog);
}

export async function getConnectionLog(userId: string, logId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(logId)) return null;
  return selectMaybe<ConnectionLogRow, ConnectionLog>(
    (c) =>
      c.from("act_connection_logs").select("*").eq("user_id", userId).eq("id", logId).maybeSingle(),
    mapConnectionLog,
  );
}

export async function saveConnectionLog(userId: string, input: ConnectionLogInput) {
  return writeSingle<ConnectionLogRow, ConnectionLog>(
    (c) =>
      c
        .from("act_connection_logs")
        .insert({
          user_id: userId,
          technique: input.technique,
          activity_context: sanitizeUserText(input.activityContext ?? "").trim(),
          notices_from_senses: sanitizeUserText(input.noticesFromSenses ?? "").trim(),
          duration_minutes: input.durationMinutes ?? null,
          mood_after: input.moodAfter ?? null,
          notes: sanitizeUserText(input.notes ?? "").trim(),
          ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
        })
        .select("*")
        .single(),
    mapConnectionLog,
  );
}

export async function deleteConnectionLog(userId: string, logId: string) {
  return mutateVoid((c) =>
    c.from("act_connection_logs").delete().eq("user_id", userId).eq("id", logId),
  );
}
