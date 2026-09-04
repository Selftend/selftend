import { useQuery } from "@tanstack/react-query";

import { listRecordDays, viewerOffsetMinutes } from "@/src/features/progress/repository";

/**
 * ☠️ This root is reached by NO mutation in the app, and that is a live gap, not
 * a decision.
 *
 * ADR-0001 keeps a stats query under the same query-key root as the list it
 * summarises, so the owning feature's save and delete invalidation reaches both.
 * That cannot apply here: `record_days` spans ten tools, so it has no owning
 * feature and sits under its own root. With the client's 60s default
 * `staleTime`, a person who logs something and walks straight to "Looking back"
 * sees today unmarked until the entry goes stale.
 *
 * `recordDaysKeys.all` exists so the fix is one line at each of the ten write
 * paths rather than a key literal copied ten times. Wiring it belongs with the
 * screen that renders the marks (#1906), not with the migration.
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

export function useRecordDays(userId: string | null, offsetMinutes = viewerOffsetMinutes()) {
  return useQuery({
    queryKey: recordDaysKeys.forViewer(userId, offsetMinutes),
    queryFn: () => listRecordDays(offsetMinutes),
    enabled: Boolean(userId),
  });
}
