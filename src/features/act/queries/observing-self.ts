import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteObservingSelfSession,
  getLatestObservingSelfSessionAt,
  getObservingSelfSession,
  listObservingSelfSessions,
  listObservingSelfSessionsPage,
  saveObservingSelfSession,
} from "@/src/features/act/repository";
import type { ObservingSelfSessionInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useObservingSelfSessions(userId: string | null, limit = 30) {
  return useQuery({
    // Include limit so 30/N callers don't collide on one cache entry; the limit-less
    // prefix in actKeys.observingList still matches every variant on invalidation.
    queryKey: [...actKeys.observingList(userId), limit],
    queryFn: () => listObservingSelfSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Every observing-self session, newest first, a page at a time — the observing-self screen's archive (#1517).
 * Flat and newest-first, never day-sectioned: #1513 binds ACT to the flat family, so no
 * day heading, date control or `formatRelativeDayKey` label belongs on what this feeds.
 */
export function useObservingSelfSessionPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: actKeys.observingHistoryPages(userId),
    queryFn: ({ pageParam }) =>
      listObservingSelfSessionsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the last page: asking for another would spend a round trip to
    // learn nothing. Only a FULL page can have more behind it.
    getNextPageParam: (lastPage) =>
      lastPage.length < ACT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (session) => session.createdAt),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestObservingSelfSessionAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.observingLatest(userId),
    queryFn: () => getLatestObservingSelfSessionAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useObservingSelfSession(userId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: actKeys.observingDetail(userId, sessionId),
    queryFn: () => getObservingSelfSession(userId!, sessionId!),
    enabled: Boolean(userId) && Boolean(sessionId),
  });
}

export function useSaveObservingSelfSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ObservingSelfSessionInput) => saveObservingSelfSession(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.observingList(userId) });
    },
  });
}

export function useDeleteObservingSelfSession(userId: string | null) {
  return useDeleteMutation(userId, deleteObservingSelfSession, actKeys.observingList(userId));
}
