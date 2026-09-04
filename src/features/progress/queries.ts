import { useQuery, type QueryClient } from "@tanstack/react-query";

import { listRecordDays, viewerOffsetMinutes } from "@/src/features/progress/repository";

/**
 * ☠️ This root is reached from every write path in the app that can change which
 * days hold a record - see `invalidateRecordDays` below for the list.
 *
 * ADR-0001 keeps a stats query under the same query-key root as the list it
 * summarises, so the owning feature's save and delete invalidation reaches both.
 * That cannot apply here: `record_days` spans ten tools, so it has no owning
 * feature and sits under its own root.
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
 * Mark every frame's record-days answer stale.
 *
 * ☠️ **Called from each of the ten tools' write paths, and it has to stay that
 * way.** With the client's 60s default `staleTime`, a person who logs a check-in
 * and walks straight to "Looking back" would see today unmarked until the entry
 * went stale - absence, on the one screen whose job is to state the record
 * truthfully, arriving from the cache instead of from the 250-row cap the RPC
 * exists to escape. And `/progress` can still be mounted behind the drawer while
 * the write happens, so a refetch-on-mount would not cover it either.
 *
 * The ten sources are the ones `record_days` reads, listed in
 * `20260907000000_record_days.sql` under "the span rule": check-ins, gratitude,
 * journal, sleep, meditation, mindfulness (breathing AND grounding), completed
 * activities, thought records, habit ticks and self-care. Anything that adds or
 * removes one of those rows belongs here; an edit that cannot move a row's day
 * does not.
 *
 * A function rather than a key literal, so a new tool has one thing to copy.
 * The five deletes that run through `useDeleteMutation` are the exception: that
 * helper takes a key rather than a client, so they pass `recordDaysKeys.all`
 * itself. Both reach the same root, which is what the guard test pins.
 */
export function invalidateRecordDays(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: recordDaysKeys.all });
}

export function useRecordDays(userId: string | null, offsetMinutes = viewerOffsetMinutes()) {
  return useQuery({
    queryKey: recordDaysKeys.forViewer(userId, offsetMinutes),
    queryFn: () => listRecordDays(offsetMinutes),
    enabled: Boolean(userId),
  });
}
