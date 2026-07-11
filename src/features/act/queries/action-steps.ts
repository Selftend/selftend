import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteActionStep,
  listActionSteps,
  listAllActionSteps,
  saveActionStep,
  toggleActionStep,
} from "@/src/features/act/repository";
import type { ActionStepInput } from "@/src/features/act/types";
import { actKeys } from "./keys";

export function useActionSteps(userId: string | null, actionId: string | null) {
  return useQuery({
    queryKey: actKeys.actionStepList(userId, actionId),
    queryFn: () => listActionSteps(userId!, actionId!),
    enabled: Boolean(userId) && Boolean(actionId),
  });
}

export function useAllActionSteps(userId: string | null) {
  return useQuery({
    queryKey: actKeys.actionStepAll(userId),
    queryFn: () => listAllActionSteps(userId!),
    enabled: Boolean(userId),
  });
}

export function useSaveActionStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActionStepInput) => saveActionStep(userId!, input),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, data.actionId),
      });
      // The ACT program screen reads useAllActionSteps (actionStepAll) - refresh it too.
      await queryClient.invalidateQueries({ queryKey: actKeys.actionStepAll(userId) });
    },
  });
}

export function useToggleActionStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      completed,
      completedAt,
    }: {
      stepId: string;
      completed: boolean;
      actionId: string;
      completedAt?: string;
    }) => toggleActionStep(userId!, stepId, completed, completedAt),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, data.actionId),
      });
      // The ACT program screen reads useAllActionSteps (actionStepAll) - refresh it too.
      await queryClient.invalidateQueries({ queryKey: actKeys.actionStepAll(userId) });
    },
  });
}

export function useDeleteActionStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId }: { stepId: string; actionId: string }) =>
      deleteActionStep(userId!, stepId),
    onSuccess: async (_data, variables) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, variables.actionId),
      });
      // The ACT program screen reads useAllActionSteps (actionStepAll) - refresh it too.
      await queryClient.invalidateQueries({ queryKey: actKeys.actionStepAll(userId) });
    },
  });
}
