import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listValuesProfiles, upsertValuesProfile } from "@/src/features/values/repository";
import type { ValuesProfileInput } from "@/src/features/values/types";

const valuesKeys = {
  all: ["values"] as const,
  list: (userId: string) => ["values", "list", userId] as const,
};

export function useValuesProfiles(userId: string | null) {
  return useQuery({
    queryKey: userId ? valuesKeys.list(userId) : ["values", "list", "anonymous"],
    queryFn: () => listValuesProfiles(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpsertValuesProfile(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ValuesProfileInput) => upsertValuesProfile(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: valuesKeys.list(userId) });
    },
  });
}
