import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteExpansionLog,
  getExpansionLog,
  getLatestExpansionLogAt,
  listExpansionLogs,
  listExpansionLogsPage,
  saveExpansionLog,
} from "@/src/features/act/repository";
import type { ExpansionLogInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useExpansionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...actKeys.expansionList(userId), limit],
    queryFn: () => listExpansionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Every expansion log, newest first, a page at a time — the acceptance screen's archive (#1517).
 * Flat and newest-first, never day-sectioned: #1513 binds ACT to the flat family, so no
 * day heading, date control or `formatRelativeDayKey` label belongs on what this feeds.
 */
export function useExpansionLogPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: actKeys.expansionHistoryPages(userId),
    queryFn: ({ pageParam }) => listExpansionLogsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
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

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestExpansionLogAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.expansionLatest(userId),
    queryFn: () => getLatestExpansionLogAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useExpansionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.expansionDetail(userId, logId),
    queryFn: () => getExpansionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveExpansionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpansionLogInput) => saveExpansionLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.expansionList(userId) });
    },
  });
}

export function useDeleteExpansionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteExpansionLog, actKeys.expansionList(userId));
}
