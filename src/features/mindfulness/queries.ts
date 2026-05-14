import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMindfulnessSessions,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";

const mindfulnessKeys = {
  all: ["mindfulness"] as const,
  list: (userId: string) => ["mindfulness", "list", userId] as const,
};

export function useMindfulnessSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? mindfulnessKeys.list(userId) : ["mindfulness", "list", "anonymous"],
    queryFn: () => listMindfulnessSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveMindfulnessSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: mindfulnessKeys.list(userId) });
    },
  });
}
