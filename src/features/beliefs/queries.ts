import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteCoreBelief,
  getCoreBelief,
  getLatestCoreBeliefAt,
  listCoreBeliefs,
  saveCoreBelief,
  updateBeliefStrength,
} from "@/src/features/beliefs/repository";
import type { CoreBeliefInput } from "@/src/features/beliefs/types";

const beliefKeys = {
  all: ["beliefs"] as const,
  list: (userId: string) => ["beliefs", "list", userId] as const,
  // Nested under the list prefix so the save invalidation below reaches it too.
  latest: (userId: string) => ["beliefs", "list", userId, "latest"] as const,
  detail: (userId: string, beliefId: string) => ["beliefs", "detail", userId, beliefId] as const,
};

export function useCoreBeliefs(userId: string | null) {
  return useQuery({
    queryKey: userId ? beliefKeys.list(userId) : ["beliefs", "list", "anonymous"],
    queryFn: () => listCoreBeliefs(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 500-row list (#990). */
export function useLatestCoreBeliefAt(userId: string | null) {
  return useQuery({
    queryKey: userId ? beliefKeys.latest(userId) : ["beliefs", "list", "anonymous", "latest"],
    queryFn: () => getLatestCoreBeliefAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useCoreBelief(userId: string | null, beliefId: string | null) {
  return useQuery({
    queryKey:
      userId && beliefId ? beliefKeys.detail(userId, beliefId) : ["beliefs", "detail", "anonymous"],
    queryFn: () => getCoreBelief(userId!, beliefId!),
    enabled: Boolean(userId && beliefId),
  });
}

export function useSaveCoreBelief(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, beliefId }: { input: CoreBeliefInput; beliefId?: string }) =>
      saveCoreBelief(userId!, input, beliefId),
    meta: { suppressGlobalErrorToast: true }, // wizard shows its own save-error toast
    onSuccess: async (belief) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: beliefKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: beliefKeys.detail(userId, belief.id) }),
      ]);
    },
  });
}

export function useDeleteCoreBelief(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (beliefId: string) => deleteCoreBelief(userId!, beliefId),
    // The confirmation stays OPEN when this fails, and it is a native modal - so the
    // detail screen renders the failure inline in the dialog rather than behind it (#1364).
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: beliefKeys.all });
    },
  });
}

export function useUpdateBeliefStrength(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      beliefId,
      originalBeliefStrength,
      alternativeBeliefStrength,
    }: {
      beliefId: string;
      originalBeliefStrength: number;
      alternativeBeliefStrength: number;
    }) =>
      updateBeliefStrength(userId!, beliefId, originalBeliefStrength, alternativeBeliefStrength),
    meta: { suppressGlobalErrorToast: true }, // detail screen shows its own error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: beliefKeys.all });
    },
  });
}
