import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteBreathingExercise,
  getBreathingExercise,
  listBreathingExercises,
  saveBreathingExercise,
} from "@/src/features/breathing/exercises-repository";
import type { BreathingExerciseInput } from "@/src/features/breathing/exercise-types";

const exerciseKeys = {
  all: ["breathing-exercises"] as const,
  list: (userId: string) => ["breathing-exercises", "list", userId] as const,
  detail: (userId: string, id: string) => ["breathing-exercises", "detail", userId, id] as const,
};

export function useBreathingExercises(userId: string | null) {
  return useQuery({
    queryKey: userId ? exerciseKeys.list(userId) : ["breathing-exercises", "list", "anonymous"],
    queryFn: () => listBreathingExercises(userId!),
    enabled: Boolean(userId),
  });
}

export function useBreathingExercise(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id
        ? exerciseKeys.detail(userId, id)
        : ["breathing-exercises", "detail", "anonymous", id ?? ""],
    queryFn: () => getBreathingExercise(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useSaveBreathingExercise(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: BreathingExerciseInput; id?: string }) =>
      saveBreathingExercise(userId!, input, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useDeleteBreathingExercise(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBreathingExercise(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}
