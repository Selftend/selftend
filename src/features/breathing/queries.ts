import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMindfulnessSessions,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { breathingSlugs } from "@/src/constants/breathing";

const breathingKeys = {
  list: (userId: string) => ["breathing", "list", userId] as const,
};

export function useBreathingSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? breathingKeys.list(userId) : ["breathing", "list", "anonymous"],
    queryFn: async () => {
      const all = await listMindfulnessSessions(userId!, limit);
      return all.filter((s) => breathingSlugs.includes(s.exerciseName));
    },
    enabled: Boolean(userId),
  });
}

export function useSaveBreathingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: breathingKeys.list(userId) });
    },
  });
}
