import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listRecordDays, viewerOffsetMinutes } from "@/src/features/progress/repository";

/**
 * ☠️ This root is reached by no mutation of its own, and that is why
 * `useInvalidateRecordDays` below exists.
 *
 * ADR-0001 keeps a stats query under the same query-key root as the list it
 * summarises, so the owning feature's save and delete invalidation reaches both.
 * That cannot apply here: `record_days` spans ten tools, so it has no owning
 * feature and sits under its own root. With the client's 60s default
 * `staleTime`, a person who logs something and walks straight to "Looking back"
 * would see today unmarked until the entry goes stale - absence, on the one
 * screen whose job is to state the record truthfully.
 *
 * `recordDaysKeys.all` is the handle, so the fix is one line at each write path
 * rather than a key literal copied eighteen times (#1904 → #1906).
 */
export const recordDaysKeys = {
  all: ["progress", "record-days"] as const,
  /**
   * The key carries the fallback offset as well as the user id, because the RPC
   * reads both.
   *
   * They move independently: rows that captured no offset are bucketed by the
   * frame passed in, so flying between zones changes the answer for those rows
   * while the user id does not move. Keying on the id alone would serve the
   * departure city's days after arrival. Extracted so that is testable without
   * rendering the hook.
   */
  forViewer: (userId: string | null, offsetMinutes: number) =>
    [...recordDaysKeys.all, userId ?? "anonymous", offsetMinutes] as const,
};

/**
 * Call after any write that can change WHICH DAYS hold a record (#1906).
 *
 * ☠️ Every one of the ten sources needs this, because none of them owns the
 * key: `record_days` is the only query in the app that no feature's own
 * invalidation can reach. `test/record-days-invalidation.test.ts` derives the
 * set of write paths from source and fails when a new one lands without a call,
 * so the eleventh tool cannot be added silently.
 *
 * Invalidating on any write to a source table rather than only on writes that
 * demonstrably move a day: the cheap, always-correct rule. Deciding per
 * mutation whether a particular edit can shift a civil day is exactly the
 * judgement that rots - a sleep window's day comes from when it BEGAN (#800),
 * an activity counts only once completed, and archiving is the thought record's
 * delete. One redundant RPC costs less than one wrong absence.
 */
export function useInvalidateRecordDays() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: recordDaysKeys.all });
}

export function useRecordDays(userId: string | null, offsetMinutes = viewerOffsetMinutes()) {
  return useQuery({
    queryKey: recordDaysKeys.forViewer(userId, offsetMinutes),
    queryFn: () => listRecordDays(offsetMinutes),
    enabled: Boolean(userId),
  });
}
