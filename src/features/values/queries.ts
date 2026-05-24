import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getValuesProfile, saveValuesProfile } from "@/src/features/values/repository";
import type { ValuesProfileInput } from "@/src/features/values/types";

const valuesKeys = {
  all: ["values"] as const,
  profile: (userId: string) => ["values", "profile", userId] as const,
};

export function useValuesProfile(userId: string | null) {
  return useQuery({
    queryKey: userId ? valuesKeys.profile(userId) : ["values", "profile", "anonymous"],
    queryFn: () => getValuesProfile(userId!),
    enabled: Boolean(userId),
  });
}

export function useSaveValuesProfile(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ValuesProfileInput) => saveValuesProfile(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: valuesKeys.profile(userId) });
    },
  });
}
