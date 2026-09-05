import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countEmotionRecords,
  deleteEmotionRecord,
  getEmotionRecord,
  listEmotionRecords,
  listEmotionRecordsPage,
  saveEmotionRecord,
} from "@/src/features/dbt/repository";
import type { EmotionRecordInput } from "@/src/features/dbt/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { invalidateRecordDays, recordDaysKeys } from "@/src/features/progress/queries";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { DBT_HISTORY_PAGE_SIZE, dbtKeys } from "./keys";

export function useEmotionRecords(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...dbtKeys.emotionRecordList(userId), limit],
    queryFn: () => listEmotionRecords(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useEmotionRecordPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: dbtKeys.emotionRecordHistoryPages(userId),
    queryFn: ({ pageParam }) => listEmotionRecordsPage(userId!, DBT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < DBT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (row) => row.createdAt),
    enabled: Boolean(userId),
  });
}

export function useEmotionRecordCount(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.emotionRecordCount(userId),
    queryFn: () => countEmotionRecords(userId!),
    enabled: Boolean(userId),
  });
}

export function useEmotionRecord(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: dbtKeys.emotionRecordDetail(userId, id),
    queryFn: () => getEmotionRecord(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveEmotionRecord(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmotionRecordInput) => saveEmotionRecord(userId!, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      // The once-ever reminder offer rides any DBT save (spec §4). The store
      // decides whether to show it and the shipped eligibility gates it; this
      // only reports that a save happened.
      requestReminderPrompt("dbt");
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.emotionRecordList(userId) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

export function useDeleteEmotionRecord(userId: string | null) {
  return useDeleteMutation(
    userId,
    deleteEmotionRecord,
    dbtKeys.emotionRecordList(userId),
    recordDaysKeys.all,
  );
}
