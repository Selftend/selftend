import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getUrgeSurfLog,
  listUrgeSurfLogs,
  listUrgeSurfLogsPage,
  saveUrgeSurfLog,
} from "@/src/features/act/repository";
import type { UrgeSurfLogInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useUrgeSurfLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...actKeys.urgeSurfList(userId), limit],
    queryFn: () => listUrgeSurfLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Every urge-surf log, newest first, a page at a time — the urge-surfing screen's
 * archive (#1517).
 *
 * ☠️ This replaces a hard `useUrgeSurfLogs(user, 5)` on the tool screen itself. Urge surf
 * had no list route and no `[id]` route, so its sixth-oldest entry was unreachable by
 * every path, id included — the only ACT feed in that position.
 */
export function useUrgeSurfLogPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: actKeys.urgeSurfHistoryPages(userId),
    queryFn: ({ pageParam }) => listUrgeSurfLogsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
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

/** One urge-surf log, for the detail route #1517 adds. */
export function useUrgeSurfLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.urgeSurfDetail(userId, logId),
    queryFn: () => getUrgeSurfLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveUrgeSurfLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UrgeSurfLogInput) => saveUrgeSurfLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.urgeSurfList(userId) });
    },
  });
}
