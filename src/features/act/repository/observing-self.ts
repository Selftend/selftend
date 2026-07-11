import type {
  ObservingSelfSession,
  ObservingSelfSessionInput,
  ObservingTechnique,
} from "@/src/features/act/types";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { selectList, selectMaybe, writeSingle, mutateVoid } from "./helpers";

interface ObservingSelfSessionRow {
  id: string;
  user_id: string;
  technique_used: string;
  what_was_observed: string;
  duration_minutes: number | null;
  mood_after: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapObservingSelfSession(row: ObservingSelfSessionRow): ObservingSelfSession {
  return {
    id: row.id,
    userId: row.user_id,
    techniqueUsed: row.technique_used as ObservingTechnique,
    whatWasObserved: row.what_was_observed,
    durationMinutes: row.duration_minutes,
    moodAfter: row.mood_after,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listObservingSelfSessions(userId: string, limit = 30) {
  return selectList<ObservingSelfSessionRow, ObservingSelfSession>(
    (c) =>
      c
        .from("act_observing_self_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    mapObservingSelfSession,
  );
}

export async function getObservingSelfSession(userId: string, sessionId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(sessionId)) return null;
  return selectMaybe<ObservingSelfSessionRow, ObservingSelfSession>(
    (c) =>
      c
        .from("act_observing_self_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("id", sessionId)
        .maybeSingle(),
    mapObservingSelfSession,
  );
}

export async function saveObservingSelfSession(userId: string, input: ObservingSelfSessionInput) {
  return writeSingle<ObservingSelfSessionRow, ObservingSelfSession>(
    (c) =>
      c
        .from("act_observing_self_sessions")
        .insert({
          user_id: userId,
          technique_used: input.techniqueUsed,
          what_was_observed: sanitizeUserText(input.whatWasObserved ?? "").trim(),
          duration_minutes: input.durationMinutes ?? null,
          mood_after: input.moodAfter ?? null,
          notes: sanitizeUserText(input.notes ?? "").trim(),
          ...(input.createdAt !== undefined ? { created_at: input.createdAt } : {}),
        })
        .select("*")
        .single(),
    mapObservingSelfSession,
  );
}

export async function deleteObservingSelfSession(userId: string, sessionId: string) {
  return mutateVoid((c) =>
    c.from("act_observing_self_sessions").delete().eq("user_id", userId).eq("id", sessionId),
  );
}
