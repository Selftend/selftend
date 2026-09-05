import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countJudgements,
  deleteJudgement,
  getJudgement,
  listJudgements,
  listJudgementsPage,
  saveJudgement,
} from "@/src/features/dbt/repository";
import type { JudgementInput } from "@/src/features/dbt/types";
import { invalidateRecordDays, recordDaysKeys } from "@/src/features/progress/queries";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { DBT_HISTORY_PAGE_SIZE, dbtKeys } from "./keys";

export function useJudgements(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...dbtKeys.judgementList(userId), limit],
    queryFn: () => listJudgements(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useJudgementPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: dbtKeys.judgementHistoryPages(userId),
    queryFn: ({ pageParam }) => listJudgementsPage(userId!, DBT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < DBT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (row) => row.createdAt),
    enabled: Boolean(userId),
  });
}

export function useJudgementCount(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.judgementCount(userId),
    queryFn: () => countJudgements(userId!),
    enabled: Boolean(userId),
  });
}

export function useJudgement(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: dbtKeys.judgementDetail(userId, id),
    queryFn: () => getJudgement(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveJudgement(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JudgementInput) => saveJudgement(userId!, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.judgementList(userId) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

export function useDeleteJudgement(userId: string | null) {
  return useDeleteMutation(
    userId,
    deleteJudgement,
    dbtKeys.judgementList(userId),
    recordDaysKeys.all,
  );
}
