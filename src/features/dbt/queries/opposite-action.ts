import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countOppositeActionPlans,
  deleteOppositeActionPlan,
  getOppositeActionPlan,
  listOppositeActionPlans,
  listOppositeActionPlansPage,
  markOppositeActionPlanDone,
  saveOppositeActionPlan,
} from "@/src/features/dbt/repository";
import type { OppositeActionDoneInput, OppositeActionPlanInput } from "@/src/features/dbt/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { invalidateRecordDays, recordDaysKeys } from "@/src/features/progress/queries";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { DBT_HISTORY_PAGE_SIZE, dbtKeys } from "./keys";

export function useOppositeActionPlans(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: [...dbtKeys.oppositeActionList(userId), limit],
    queryFn: () => listOppositeActionPlans(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useOppositeActionPlanPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: dbtKeys.oppositeActionHistoryPages(userId),
    queryFn: ({ pageParam }) =>
      listOppositeActionPlansPage(userId!, DBT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < DBT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (row) => row.createdAt),
    enabled: Boolean(userId),
  });
}

export function useOppositeActionPlanCount(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.oppositeActionCount(userId),
    queryFn: () => countOppositeActionPlans(userId!),
    enabled: Boolean(userId),
  });
}

export function useOppositeActionPlan(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: dbtKeys.oppositeActionDetail(userId, id),
    queryFn: () => getOppositeActionPlan(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveOppositeActionPlan(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OppositeActionPlanInput) => saveOppositeActionPlan(userId!, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      // The once-ever reminder offer rides any DBT save (spec §4). The store
      // decides whether to show it and the shipped eligibility gates it; this
      // only reports that a save happened.
      requestReminderPrompt("dbt");
      if (!userId) return;
      // An open plan marks no day, but the rule is coarse on purpose (#1906):
      // any write to a `record_days` source invalidates.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.oppositeActionList(userId) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

/** Done from the detail - the done day is the day that marks (#1988). */
export function useMarkOppositeActionPlanDone(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OppositeActionDoneInput }) =>
      markOppositeActionPlanDone(userId!, id, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async (plan) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.oppositeActionList(userId) }),
        queryClient.invalidateQueries({ queryKey: dbtKeys.oppositeActionDetail(userId, plan.id) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

export function useDeleteOppositeActionPlan(userId: string | null) {
  return useDeleteMutation(
    userId,
    deleteOppositeActionPlan,
    dbtKeys.oppositeActionList(userId),
    recordDaysKeys.all,
  );
}
