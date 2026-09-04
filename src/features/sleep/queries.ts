import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countSleepLogs,
  deleteSleepLog,
  getSleepLog,
  listSleepLogs,
  listSleepLogsPage,
  saveSleepLog,
  sleepStats,
} from "@/src/features/sleep/repository";
import type { SleepInput, SleepLog } from "@/src/features/sleep/types";
import type { QueryClient } from "@tanstack/react-query";
import { nextDescendingDayCursor, type DayRecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { deviceTimeZone } from "@/src/utils/date";
import { recordDaysKeys, useInvalidateRecordDays } from "@/src/features/progress/queries";

const sleepKeys = {
  all: ["sleep"] as const,
  list: (userId: string, limit: number) => ["sleep", "list", userId, limit] as const,
  historyPages: (userId: string) => ["sleep", "historyPages", userId] as const,
  detail: (userId: string, id: string) => ["sleep", "detail", userId, id] as const,
  count: (userId: string) => ["sleep", "count", userId] as const,
  // The time zone is part of the key, not just the argument: it decides which civil day
  // each night falls in, so a traveller's stats are genuinely different data rather than
  // a stale copy of the same query.
  stats: (userId: string, timeZone: string) => ["sleep", "stats", userId, timeZone] as const,
};

/**
 * Seed the detail cache with a row a list already holds, so opening an entry
 * from the paged all-history screen never depends on a fresh fetch succeeding.
 * The detail screen's own capped-list lookup only covers the newest 50 rows;
 * an older entry reached through history would otherwise fire one lone
 * `getSleepLog` request and, if it failed offline, claim the entry the user
 * just tapped does not exist. The detail query still refreshes in the
 * background; this only guarantees it has honest data to show meanwhile.
 */
export function seedSleepLogDetail(queryClient: QueryClient, log: SleepLog) {
  queryClient.setQueryData(sleepKeys.detail(log.userId, log.id), log);
}

export function useSleepLogs(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: userId ? sleepKeys.list(userId, limit) : ["sleep", "list", "anonymous", limit],
    queryFn: () => listSleepLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Page size for the all-history screen. Large enough that a first page fills
 * several screens of rows, small enough that the first paint doesn't pay to
 * decrypt a year of notes and windows — every returned row decrypts its
 * ciphertext whatever the projection, because `app.decrypt_text` is VOLATILE
 * (#693).
 */
export const SLEEP_HISTORY_PAGE_SIZE = 50;

/**
 * The unbounded history, one page at a time — check-in's paging, adopted
 * verbatim (#696, #775). The key sits under the `sleep` root, so a save or
 * delete still invalidates it with the rest; every later page is anchored to
 * the last row of the prior page, so inserts or deletes above that boundary
 * cannot shift it.
 */
export function useSleepHistoryPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId ? sleepKeys.historyPages(userId) : ["sleep", "historyPages", "anonymous"],
    queryFn: ({ pageParam }) => listSleepLogsPage(userId!, SLEEP_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as DayRecordCursor | null,
    // A short page is the end of the data. A full one may or may not be, so ask
    // again: one empty round trip at the exact boundary beats stopping early.
    getNextPageParam: (lastPage) =>
      lastPage.length < SLEEP_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingDayCursor(
            lastPage,
            (log) => log.entryDay,
            (log) => log.createdAt,
          ),
    enabled: Boolean(userId),
  });
}

export function useSleepLog(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? sleepKeys.detail(userId, id) : ["sleep", "detail", "anonymous", id ?? ""],
    queryFn: () => getSleepLog(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useSleepLogCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? sleepKeys.count(userId) : ["sleep", "count", "anonymous"],
    queryFn: () => countSleepLogs(userId!),
    enabled: Boolean(userId),
  });
}

// Summary figures for the tracker, aggregated server-side over the whole history rather
// than the 50 logs `useSleepLogs` loads (#256). Every mutation below already invalidates
// the `sleep` prefix, so a logged, edited or deleted night refreshes these too.
export function useSleepStats(userId: string | null) {
  const timeZone = deviceTimeZone();
  return useQuery({
    queryKey: userId
      ? sleepKeys.stats(userId, timeZone)
      : ["sleep", "stats", "anonymous", timeZone],
    queryFn: () => sleepStats(timeZone),
    enabled: Boolean(userId),
  });
}

export function useSaveSleepLog(userId: string | null) {
  const queryClient = useQueryClient();
  const invalidateRecordDays = useInvalidateRecordDays();
  return useMutation({
    mutationFn: ({ input, logId }: { input: SleepInput; logId?: string }) =>
      saveSleepLog(userId!, input, logId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (_data, { logId }) => {
      if (!logId) requestReminderPrompt("sleep");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: sleepKeys.all });
      await invalidateRecordDays();
    },
  });
}

export function useDeleteSleepLog(userId: string | null) {
  return useDeleteMutation(userId, deleteSleepLog, sleepKeys.all, recordDaysKeys.all);
}
