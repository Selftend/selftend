import type {
  DbtSession,
  DbtSessionInput,
  DbtSessionSlug,
  DbtSessionVariant,
} from "@/src/features/dbt/types";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { countRows, selectList, writeSingle } from "./helpers";

interface DbtSessionRow {
  id: string;
  user_id: string;
  session_slug: string;
  variant: string | null;
  duration_seconds: number;
  completed_at: string;
  completed_offset_minutes: number | null;
  created_at: string;
  updated_at: string;
}

function mapSession(row: DbtSessionRow): DbtSession {
  const completedOffsetMinutes = row.completed_offset_minutes ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    sessionSlug: row.session_slug as DbtSessionSlug,
    variant: (row.variant as DbtSessionVariant | null) ?? null,
    durationSeconds: row.duration_seconds,
    completedAt: row.completed_at,
    completedOffsetMinutes,
    dayKey: entryDayKey(row.completed_at, completedOffsetMinutes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The module home's second stat: every completed session, lifetime (#1991). */
export async function countDbtSessions(userId: string) {
  return countRows((c) =>
    c.from("dbt_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
  );
}

/** Newest first - the programme's signal read (#1990). There is no sessions list route. */
export async function listDbtSessions(userId: string, limit = 100) {
  return selectList<DbtSessionRow, DbtSession>(
    (c) =>
      c
        .from("dbt_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(limit),
    mapSession,
  );
}

/**
 * Written on completion only (#1986): Stop saves nothing, so a row here is always
 * a finished session. There is no `stepsCompleted` and no update path.
 */
export async function saveDbtSession(userId: string, input: DbtSessionInput) {
  return writeSingle<DbtSessionRow, DbtSession>(
    (c) =>
      c
        .from("dbt_sessions")
        .insert({
          user_id: userId,
          session_slug: input.sessionSlug,
          variant: input.variant ?? null,
          duration_seconds: input.durationSeconds,
          completed_at: input.completedAt,
          completed_offset_minutes: input.completedOffsetMinutes,
        })
        .select("*")
        .single(),
    mapSession,
  );
}
