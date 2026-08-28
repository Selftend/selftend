import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countChoicePoints,
  deleteChoicePoint,
  getChoicePoint,
  getLatestChoicePointAt,
  listChoicePoints,
  listChoicePointsPage,
  saveChoicePoint,
} from "@/src/features/act/repository";
import type { ChoicePointInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useChoicePoints(userId: string | null, limit = 30) {
  return useQuery({
    // Include limit so 30/N callers don't collide on one cache entry; the limit-less
    // prefix in actKeys.choicePointList still matches every variant on invalidation.
    queryKey: [...actKeys.choicePointList(userId), limit],
    queryFn: () => listChoicePoints(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Every choice point, newest first, a page at a time — the choice-point screen's archive (#1517).
 * Flat and newest-first, never day-sectioned: #1513 binds ACT to the flat family, so no
 * day heading, date control or `formatRelativeDayKey` label belongs on what this feeds.
 */
export function useChoicePointPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: actKeys.choicePointHistoryPages(userId),
    queryFn: ({ pageParam }) => listChoicePointsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the last page: asking for another would spend a round trip to
    // learn nothing. Only a FULL page can have more behind it.
    getNextPageParam: (lastPage) =>
      lastPage.length < ACT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (choicePoint) => choicePoint.createdAt),
    enabled: Boolean(userId),
  });
}

/**
 * ACT home's "N choice points mapped" stat - an exact head count, never
 * `useChoicePoints(...).data?.length`; `countRows` explains why (#1378).
 */
export function useChoicePointCount(userId: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointCount(userId),
    queryFn: () => countChoicePoints(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestChoicePointAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointLatest(userId),
    queryFn: () => getLatestChoicePointAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useChoicePoint(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointDetail(userId, id),
    queryFn: () => getChoicePoint(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveChoicePoint(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChoicePointInput) => saveChoicePoint(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.choicePointList(userId) });
    },
  });
}

export function useDeleteChoicePoint(userId: string | null) {
  return useDeleteMutation(userId, deleteChoicePoint, actKeys.choicePointList(userId));
}
