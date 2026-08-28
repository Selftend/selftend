import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countDefusionLogs,
  deleteDefusionLog,
  getDefusionLog,
  getLatestDefusionLogAt,
  listDefusionLogs,
  listDefusionLogsPage,
  saveDefusionLog,
} from "@/src/features/act/repository";
import type { DefusionLogInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useDefusionLogs(userId: string | null, limit = 30) {
  return useQuery({
    // Include limit so 30/N callers don't collide on one cache entry; the limit-less
    // prefix in actKeys.defusionList still matches every variant on invalidation.
    queryKey: [...actKeys.defusionList(userId), limit],
    queryFn: () => listDefusionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Every defusion log, newest first, a page at a time — the defusion screen's archive
 * (#1517). Flat and newest-first, never day-sectioned: #1513 binds ACT to the flat
 * family, so no day heading, date control or `formatRelativeDayKey` label belongs on
 * what this feeds.
 */
export function useDefusionLogPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: actKeys.defusionHistoryPages(userId),
    queryFn: ({ pageParam }) => listDefusionLogsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the last page: asking for another would spend a round trip to
    // learn nothing. Only a FULL page can have more behind it.
    getNextPageParam: (lastPage) =>
      lastPage.length < ACT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (log) => log.createdAt),
    enabled: Boolean(userId),
  });
}

/**
 * ACT home's "N thoughts unhooked" stat - an exact head count, never
 * `useDefusionLogs(...).data?.length`; `countRows` explains why (#1378).
 */
export function useDefusionLogCount(userId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionCount(userId),
    queryFn: () => countDefusionLogs(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestDefusionLogAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionLatest(userId),
    queryFn: () => getLatestDefusionLogAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useDefusionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionDetail(userId, logId),
    queryFn: () => getDefusionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveDefusionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DefusionLogInput) => saveDefusionLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.defusionList(userId) });
    },
  });
}

export function useDeleteDefusionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteDefusionLog, actKeys.defusionList(userId));
}
