import type {
  ACTLifeDomain,
  ActionStatus,
  CommittedAction,
  CommittedActionInput,
  CommittedActionPatch,
} from "@/src/features/act/types";
// `requireSupabase` came with dev's target-date validation, but its only caller
// was the hand-rolled `countCommittedActions` body that #1378 replaced with the
// shared `countRows` helper. `isValidDayKey` is still the validator's.
import { isValidDayKey } from "@/src/utils/date";
import { isValidUuid } from "@/src/utils/uuid";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { countRows, selectList, selectMaybe, writeSingle, mutateVoid } from "./helpers";
import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";

interface CommittedActionRow {
  id: string;
  user_id: string;
  life_domain: string;
  title: string;
  description: string;
  status: string;
  target_date: string | null;
  obstacles: string;
  created_at: string;
  updated_at: string;
}

function mapCommittedAction(row: CommittedActionRow): CommittedAction {
  return {
    id: row.id,
    userId: row.user_id,
    lifeDomain: row.life_domain as ACTLifeDomain,
    title: row.title,
    description: row.description,
    status: row.status as ActionStatus,
    targetDate: row.target_date,
    obstacles: row.obstacles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * A target date is a `YYYY-MM-DD` day key, or nothing at all.
 *
 * `target_date` is a real Postgres `date`, so anything else is refused by the
 * column — which fails the ENTIRE write with a generic backend error naming
 * neither the field nor the reason, losing the committed action the user just
 * wrote (#1303).
 *
 * The CBT goal makes the same guarantee in its Zod schema. ACT has no Zod
 * schema and no react-hook-form — the wizard is plain `useState` — so the check
 * lives here instead: same `isValidDayKey`, same guarantee, one layer down.
 * Converge on behaviour, not mechanism.
 *
 * The rejected value is deliberately NOT in the message. The mutation cache's
 * global `onError` reports throws to Sentry, and whatever a caller passed is
 * the user's own text.
 */
function assertTargetDateIsDayKey(targetDate: string | null | undefined) {
  if (targetDate == null) return;
  if (!isValidDayKey(targetDate)) {
    throw new Error("Committed action target date must be a YYYY-MM-DD day key");
  }
}

/**
 * How many committed actions a user has, for Home's `N active` row (#990) and ACT
 * home's lifetime stat run (#1378).
 *
 * An exact `head` count needs no function under ADR-0001, and `status` is plaintext on
 * the base table so nothing decrypts. `listCommittedActions` has no `.limit()` at all,
 * which made this the one row whose cost grew without bound with the user's history.
 *
 * `status` is **optional**: omitting it counts actions at every status. ACT home's stat
 * needs that, because an active-only count falls 1 → 0 when a user completes their only
 * action, and a counter that goes down on success reads as punishment for finishing.
 * The filter is skipped rather than passed as `undefined` - PostgREST would send that as
 * a real filter and match nothing.
 */
export async function countCommittedActions(
  userId: string,
  status?: ActionStatus,
): Promise<number> {
  return countRows((c) => {
    const query = c
      .from("act_committed_actions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return status ? query.eq("status", status) : query;
  });
}

/**
 * Deliberately unbounded, and #1516 kept it that way rather than reaching for a cap.
 *
 * This is the one ACT read whose cost grows without bound (ADR-0001: `rows returned ×
 * encrypted columns`), so a `.limit()` is the obvious reflex - but committed actions are a
 * task list, not a history feed, and its callers need completeness for different reasons:
 * the widget's `"active"` read, the routines engine and the programme all treat a missing
 * row as a row that does not exist. A cap there would silently drop an active commitment a
 * user is still working on, which is a worse failure than an expensive read.
 *
 * ☠️ #1517 resolved that coverage call, and NOT the way the paragraph above expected. The
 * list screen could not simply "take the keyset shape": it renders three status sections
 * from one fetch, and a flat `created_at desc` page cuts across all three — page 1 can
 * legitimately hold zero active rows, and the sections would fill raggedly as the user
 * scrolls. So the read is SPLIT by status instead. This function stays unbounded and keeps
 * serving `status: "active"` and the non-list callers, whole; the finished half moved to
 * `listCommittedActionArchivePage`, which is what joins the contract test. Status sectioning
 * names no day, so this is not a #1513 second-frame problem.
 */
export async function listCommittedActions(userId: string, status?: ActionStatus) {
  return selectList<CommittedActionRow, CommittedAction>((c) => {
    let query = c
      .from("act_committed_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    return query;
  }, mapCommittedAction);
}

/**
 * The statuses that are history rather than a working set.
 *
 * Exported so the screen's "everything not in this list is still live" split and the read
 * agree by construction — a fourth status added to one and not the other would silently
 * vanish from both sections.
 */
export const COMMITTED_ACTION_ARCHIVE_STATUSES = ["completed", "abandoned"] as const;

/**
 * One page of the finished committed actions, newest first (#1517).
 *
 * This is the half of the committed-action list that grows without bound: a user only ever
 * adds to what they have completed or abandoned, while the active set stays a working list
 * they keep short themselves. Bounding the growing half is what makes the unbounded read
 * above safe to keep — see its docblock for why a cap on `active` is the worse failure.
 *
 * Keyset on the plaintext `created_at`, never `.range()`, for ADR-0001's reason: an offset
 * page re-reads and re-decrypts every row it skips.
 */
export async function listCommittedActionArchivePage(
  userId: string,
  limit: number,
  cursor: RecordCursor | null,
) {
  return selectList<CommittedActionRow, CommittedAction>((c) => {
    let query = c
      .from("act_committed_actions")
      .select("*")
      .eq("user_id", userId)
      .in("status", [...COMMITTED_ACTION_ARCHIVE_STATUSES])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("created_at", cursor));
    return query.limit(limit);
  }, mapCommittedAction);
}

export async function getCommittedAction(userId: string, actionId: string) {
  // A malformed route id would 400 on PostgREST's uuid cast (console error); it's just not-found.
  if (!isValidUuid(actionId)) return null;
  return selectMaybe<CommittedActionRow, CommittedAction>(
    (c) =>
      c
        .from("act_committed_actions")
        .select("*")
        .eq("user_id", userId)
        .eq("id", actionId)
        .maybeSingle(),
    mapCommittedAction,
  );
}

export async function saveCommittedAction(userId: string, input: CommittedActionInput) {
  assertTargetDateIsDayKey(input.targetDate);
  return writeSingle<CommittedActionRow, CommittedAction>(
    (c) =>
      c
        .from("act_committed_actions")
        .insert({
          user_id: userId,
          life_domain: input.lifeDomain,
          title: sanitizeUserText(input.title).trim(),
          description: sanitizeUserText(input.description ?? "").trim(),
          status: input.status ?? "active",
          target_date: input.targetDate ?? null,
          obstacles: sanitizeUserText(input.obstacles ?? "").trim(),
        })
        .select("*")
        .single(),
    mapCommittedAction,
  );
}

export async function updateCommittedAction(
  userId: string,
  actionId: string,
  patch: CommittedActionPatch,
) {
  assertTargetDateIsDayKey(patch.targetDate);
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) payload.title = sanitizeUserText(patch.title).trim();
  if (patch.description !== undefined)
    payload.description = sanitizeUserText(patch.description).trim();
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.targetDate !== undefined) payload.target_date = patch.targetDate;
  if (patch.obstacles !== undefined) payload.obstacles = sanitizeUserText(patch.obstacles).trim();

  return writeSingle<CommittedActionRow, CommittedAction>(
    (c) =>
      c
        .from("act_committed_actions")
        .update(payload)
        .eq("user_id", userId)
        .eq("id", actionId)
        .select("*")
        .single(),
    mapCommittedAction,
  );
}

export async function deleteCommittedAction(userId: string, actionId: string) {
  return mutateVoid((c) =>
    c.from("act_committed_actions").delete().eq("user_id", userId).eq("id", actionId),
  );
}
