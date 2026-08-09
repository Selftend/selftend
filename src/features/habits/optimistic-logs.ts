import type { HabitLog } from "@/src/features/habits/types";

/**
 * The scope object that IS the fourth element of a logs query key (#759).
 *
 * It used to be a *string* (`all:2026-07-10:` / `habit:abc::1`), which made the
 * cached pages unreadable to an optimistic update: selecting them is easy
 * enough by key prefix, but deciding whether a newly ticked day belongs in a
 * given page means knowing that page's `sinceDate` and `limit`, and those were
 * baked into the string. Keeping the filter structured lets the updater read
 * the window off the key instead of parsing it back out.
 */
export interface HabitLogsScope {
  habitId?: string;
  sinceDate?: string;
  untilDate?: string;
  limit?: number;
}

/** Whether a tick is being added or removed. Decided once, for every page. */
export type ToggleIntent = "tick" | "untick";

const OPTIMISTIC_ID_PREFIX = "optimistic";

/**
 * A stable placeholder id, so a double-tap cannot leave two rows for one day
 * and a rollback has something unambiguous to match on.
 */
export function optimisticLogId(habitId: string, loggedOn: string): string {
  return `${OPTIMISTIC_ID_PREFIX}:${habitId}:${loggedOn}`;
}

/** Drops `undefined` entries so `{ sinceDate }` and `{ sinceDate, limit: undefined }` hash alike. */
export function habitLogsScope(options: HabitLogsScope): HabitLogsScope {
  const scope: HabitLogsScope = {};
  if (options.habitId !== undefined) scope.habitId = options.habitId;
  if (options.sinceDate !== undefined) scope.sinceDate = options.sinceDate;
  if (options.untilDate !== undefined) scope.untilDate = options.untilDate;
  if (options.limit !== undefined) scope.limit = options.limit;
  return scope;
}

/**
 * Is this day already ticked, according to anything the client has cached?
 *
 * The intent has to be decided ONCE, across every page, and then applied
 * uniformly. Letting each page decide for itself would let two pages disagree -
 * the 30-day window holds today's log, the `limit: 1` page happens not to - and
 * the same tap would then insert a row into one cache and delete one from
 * another. The server's `toggleHabitLog` flips a single row, so exactly one of
 * those guesses could ever be right.
 */
export function isTickedInAnyPage(
  pages: (HabitLog[] | undefined)[],
  habitId: string,
  loggedOn: string,
): boolean {
  return pages.some((page) =>
    (page ?? []).some((log) => log.habitId === habitId && log.loggedOn === loggedOn),
  );
}

/**
 * Apply a decided tick/untick to ONE cached page, honouring that page's scope.
 *
 * Returns the same array reference when the page is unaffected, so React Query
 * skips the notify for caches that did not actually change.
 */
export function applyOptimisticToggle(
  logs: HabitLog[] | undefined,
  intent: ToggleIntent,
  params: { userId: string; habitId: string; loggedOn: string },
  scope: HabitLogsScope,
): HabitLog[] | undefined {
  // An unloaded page is not an empty page - materializing one here would
  // publish a cache entry the query never fetched.
  if (!logs) return logs;
  const { userId, habitId, loggedOn } = params;

  if (intent === "untick") {
    // A `limit`-scoped page is a *summary* ("what was the most recent tick?"),
    // not the list the user is looking at. Unticking its only row would empty
    // it, and an empty lifetime page is what the header reads as "No ticks
    // yet" - manufacturing exactly the false claim the subline is written to
    // avoid. The client no longer knows the answer; stale beats invented, and
    // the settle-time invalidation replaces it either way.
    if (scope.limit !== undefined) return logs;
    const next = logs.filter((log) => !(log.habitId === habitId && log.loggedOn === loggedOn));
    return next.length === logs.length ? logs : next;
  }

  // The page does not cover this row, so a tick must not appear inside it.
  if (scope.habitId !== undefined && scope.habitId !== habitId) return logs;
  if (scope.sinceDate !== undefined && loggedOn < scope.sinceDate) return logs;
  if (scope.untilDate !== undefined && loggedOn > scope.untilDate) return logs;
  if (logs.some((log) => log.habitId === habitId && log.loggedOn === loggedOn)) return logs;

  const now = new Date().toISOString();
  const optimistic: HabitLog = {
    id: optimisticLogId(habitId, loggedOn),
    userId,
    habitId,
    loggedOn,
    // A tick from the overview writes no note, and never asks for one (#759).
    note: "",
    createdAt: now,
    updatedAt: now,
  };

  // `listHabitLogs` orders by `logged_on` descending; the placeholder has to
  // land where the refetched row will, or the row visibly jumps on settle.
  const next = [...logs, optimistic].sort((a, b) => b.loggedOn.localeCompare(a.loggedOn));
  return scope.limit !== undefined ? next.slice(0, scope.limit) : next;
}
