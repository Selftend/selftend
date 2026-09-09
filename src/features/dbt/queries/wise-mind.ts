import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countWiseMindCheckins,
  deleteWiseMindCheckin,
  getWiseMindCheckin,
  listWiseMindCheckins,
  listWiseMindCheckinsPage,
  saveWiseMindCheckin,
} from "@/src/features/dbt/repository";
import type { WiseMindCheckinInput } from "@/src/features/dbt/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { invalidateRecordDays, recordDaysKeys } from "@/src/features/progress/queries";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { DBT_HISTORY_PAGE_SIZE, dbtKeys } from "./keys";

export function useWiseMindCheckins(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...dbtKeys.wiseMindList(userId), limit],
    queryFn: () => listWiseMindCheckins(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useWiseMindCheckinPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: dbtKeys.wiseMindHistoryPages(userId),
    queryFn: ({ pageParam }) => listWiseMindCheckinsPage(userId!, DBT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < DBT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (row) => row.createdAt),
    enabled: Boolean(userId),
  });
}

export function useWiseMindCheckinCount(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.wiseMindCount(userId),
    queryFn: () => countWiseMindCheckins(userId!),
    enabled: Boolean(userId),
  });
}

export function useWiseMindCheckin(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: dbtKeys.wiseMindDetail(userId, id),
    queryFn: () => getWiseMindCheckin(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveWiseMindCheckin(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WiseMindCheckinInput) => saveWiseMindCheckin(userId!, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      // The once-ever reminder offer rides any DBT save (spec §4). The store
      // decides whether to show it and the shipped eligibility gates it; this
      // only reports that a save happened.
      requestReminderPrompt("dbt");
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.wiseMindList(userId) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

export function useDeleteWiseMindCheckin(userId: string | null) {
  return useDeleteMutation(
    userId,
    deleteWiseMindCheckin,
    dbtKeys.wiseMindList(userId),
    recordDaysKeys.all,
  );
}
