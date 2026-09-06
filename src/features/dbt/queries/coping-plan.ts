import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteCopingPlan, getCopingPlan, saveCopingPlan } from "@/src/features/dbt/repository";
import type { CopingPlanDocument } from "@/src/features/dbt/types";
import { dbtKeys } from "./keys";

/**
 * The person's one plan, or null before it is built. Prefetched by the module
 * home (`usePrefetchCopingPlan`) so the card is in the persisted query cache on
 * iOS and Android for a day after the module was last opened (#1986) - web is
 * memory-only by design, and the card says nothing about either.
 *
 * The plan has no day and is no record, so nothing here touches `record_days`.
 */
export function useCopingPlan(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.copingPlan(userId),
    queryFn: () => getCopingPlan(userId!),
    enabled: Boolean(userId),
  });
}

export function usePrefetchCopingPlan() {
  const queryClient = useQueryClient();
  return (userId: string | null) => {
    if (!userId) return;
    void queryClient.prefetchQuery({
      queryKey: dbtKeys.copingPlan(userId),
      queryFn: () => getCopingPlan(userId),
    });
  };
}

export function useSaveCopingPlan(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plan, existingId }: { plan: CopingPlanDocument; existingId: string | null }) =>
      saveCopingPlan(userId!, plan, existingId),
    meta: { suppressGlobalErrorToast: true }, // the builder shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: dbtKeys.copingPlan(userId) });
    },
  });
}

export function useDeleteCopingPlan(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deleteCopingPlan(userId!, planId),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: dbtKeys.copingPlan(userId) });
    },
  });
}
