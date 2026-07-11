import type {
  ConnectionLog,
  ConnectionLogInput,
  ConnectionTechnique,
} from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle, mutateVoid } from "./helpers";

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
