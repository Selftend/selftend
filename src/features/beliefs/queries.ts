import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreBelief,
  listCoreBeliefs,
  saveCoreBelief,
  updateBeliefStrength,
} from "@/src/features/beliefs/repository";
import type { CoreBeliefInput } from "@/src/features/beliefs/types";

const beliefKeys = {
  all: ["beliefs"] as const,
  list: (userId: string) => ["beliefs", "list", userId] as const,
  detail: (userId: string, beliefId: string) => ["beliefs", "detail", userId, beliefId] as const,
};

export function useCoreBeliefs(userId: string | null) {
  return useQuery({
    queryKey: userId ? beliefKeys.list(userId) : ["beliefs", "list", "anonymous"],
    queryFn: () => listCoreBeliefs(userId!),
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
    onSuccess: async (belief) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: beliefKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: beliefKeys.detail(userId, belief.id) }),
      ]);
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
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: beliefKeys.all });
    },
  });
}
