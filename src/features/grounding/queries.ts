import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMindfulnessSessions,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { groundingSlugs } from "@/src/constants/grounding";

const groundingKeys = {
  list: (userId: string) => ["grounding", "list", userId] as const,
};

export function useGroundingSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? groundingKeys.list(userId) : ["grounding", "list", "anonymous"],
    queryFn: async () => {
      const all = await listMindfulnessSessions(userId!, limit);
      return all.filter((s) => groundingSlugs.includes(s.exerciseName));
    },
    enabled: Boolean(userId),
  });
}

export function useSaveGroundingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: groundingKeys.list(userId) });
    },
  });
}
