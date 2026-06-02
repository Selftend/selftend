import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { groundingSlugs } from "@/src/constants/grounding";

const groundingKeys = {
  list: (userId: string) => ["grounding", "list", userId] as const,
};

export function useGroundingSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? [...groundingKeys.list(userId), limit] : ["grounding", "list", "anonymous"],
    // Filter by exercise type at the DB level so `limit` applies AFTER the type filter
    // (see useBreathingSessions) - a pre-filter limit could hide every grounding session.
    queryFn: () => listMindfulnessSessionsByNames(userId!, [...groundingSlugs], limit),
    enabled: Boolean(userId),
  });
}

export function useSaveGroundingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      // Shares the mindfulness_sessions table with breathing/mindfulness - refresh all three.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["breathing"] }),
        queryClient.invalidateQueries({ queryKey: ["grounding"] }),
        queryClient.invalidateQueries({ queryKey: ["mindfulness"] }),
      ]);
    },
  });
}
