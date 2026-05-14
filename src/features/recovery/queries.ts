import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteChallengePlan,
  getRecoveryPlan,
  listChallengePlans,
  saveChallengePlan,
  upsertRecoveryPlan,
} from "@/src/features/recovery/repository";
import type { ChallengePlanInput, RecoveryPlanInput } from "@/src/features/recovery/types";

const recoveryKeys = {
  all: ["recovery"] as const,
  plan: (userId: string) => ["recovery", "plan", userId] as const,
  challenges: (userId: string) => ["recovery", "challenges", userId] as const,
};

export function useRecoveryPlan(userId: string | null) {
  return useQuery({
    queryKey: userId ? recoveryKeys.plan(userId) : ["recovery", "plan", "anonymous"],
    queryFn: () => getRecoveryPlan(userId!),
    enabled: Boolean(userId),
  });
}

export function useChallengePlans(userId: string | null) {
  return useQuery({
    queryKey: userId ? recoveryKeys.challenges(userId) : ["recovery", "challenges", "anonymous"],
    queryFn: () => listChallengePlans(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpsertRecoveryPlan(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecoveryPlanInput) => upsertRecoveryPlan(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: recoveryKeys.plan(userId) });
    },
  });
}

export function useSaveChallengePlan(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recoveryPlanId,
      input,
      challengePlanId,
    }: {
      recoveryPlanId: string;
      input: ChallengePlanInput;
      challengePlanId?: string;
    }) => saveChallengePlan(userId!, recoveryPlanId, input, challengePlanId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: recoveryKeys.challenges(userId) });
    },
  });
}

export function useDeleteChallengePlan(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengePlanId: string) => deleteChallengePlan(userId!, challengePlanId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: recoveryKeys.challenges(userId) });
    },
  });
}
