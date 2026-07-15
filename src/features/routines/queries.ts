import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SteppableToolId } from "@/src/features/routines/derive";
import {
  addStep,
  createRoutine,
  deleteRoutine,
  getRoutine,
  listRoutinesWithSteps,
  removeStep,
  reorderSteps,
  updateRoutine,
} from "@/src/features/routines/repository";
import type { RoutineInput, RoutineUpdate } from "@/src/features/routines/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";

export const routineKeys = {
  all: ["routines"] as const,
  list: (userId: string) => ["routines", "list", userId] as const,
  detail: (userId: string, id: string) => ["routines", "detail", userId, id] as const,
};

export function useRoutines(userId: string | null) {
  return useQuery({
    queryKey: userId ? routineKeys.list(userId) : ["routines", "list", "anonymous"],
    queryFn: () => listRoutinesWithSteps(userId!),
    enabled: Boolean(userId),
  });
}

export function useRoutine(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? routineKeys.detail(userId, id) : ["routines", "detail", "anonymous", id ?? ""],
    queryFn: () => getRoutine(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useCreateRoutine(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoutineInput) => createRoutine(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: routineKeys.all });
    },
  });
}

export function useUpdateRoutine(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RoutineUpdate }) =>
      updateRoutine(userId!, id, patch),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: routineKeys.all });
    },
  });
}

export function useDeleteRoutine(userId: string | null) {
  return useDeleteMutation(userId, deleteRoutine, routineKeys.all);
}

export function useAddStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      routineId,
      toolId,
      position,
    }: {
      routineId: string;
      toolId: SteppableToolId;
      position: number;
    }) => addStep(userId!, routineId, toolId, position),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: routineKeys.all });
    },
  });
}

export function useRemoveStep(userId: string | null) {
  return useDeleteMutation(userId, removeStep, routineKeys.all);
}

export function useReorderSteps(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, orderedStepIds }: { routineId: string; orderedStepIds: string[] }) =>
      reorderSteps(userId!, routineId, orderedStepIds),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: routineKeys.all });
    },
  });
}
