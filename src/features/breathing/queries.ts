import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { breathingSlugs } from "@/src/constants/breathing";

const breathingKeys = {
  list: (userId: string) => ["breathing", "list", userId] as const,
};

export function useBreathingSessions(userId: string | null, limit = 30, customIds: string[] = []) {
  const names = [...breathingSlugs, ...customIds];
  return useQuery({
    queryKey: userId
      ? [...breathingKeys.list(userId), limit, customIds.join(",")]
      : ["breathing", "list", "anonymous"],
    queryFn: () => listMindfulnessSessionsByNames(userId!, names, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveBreathingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      // Breathing, grounding, and mindfulness all persist into mindfulness_sessions, so a
      // save must refresh every view of that table, not just this namespace.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["breathing"] }),
        queryClient.invalidateQueries({ queryKey: ["grounding"] }),
        queryClient.invalidateQueries({ queryKey: ["mindfulness"] }),
      ]);
    },
  });
}
