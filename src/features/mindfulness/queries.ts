import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMindfulnessSession,
  listMindfulnessSessions,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";

const mindfulnessKeys = {
  all: ["mindfulness"] as const,
  list: (userId: string) => ["mindfulness", "list", userId] as const,
  detail: (userId: string, sessionId: string) =>
    ["mindfulness", "detail", userId, sessionId] as const,
};

export function useMindfulnessSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? mindfulnessKeys.list(userId) : ["mindfulness", "list", "anonymous"],
    queryFn: () => listMindfulnessSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useMindfulnessSession(userId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey:
      userId && sessionId
        ? mindfulnessKeys.detail(userId, sessionId)
        : ["mindfulness", "detail", "anonymous"],
    queryFn: () => getMindfulnessSession(userId!, sessionId!),
    enabled: Boolean(userId) && Boolean(sessionId),
  });
}

export function useSaveMindfulnessSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      // Shares the mindfulness_sessions table with breathing/grounding — refresh all three.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["breathing"] }),
        queryClient.invalidateQueries({ queryKey: ["grounding"] }),
        queryClient.invalidateQueries({ queryKey: ["mindfulness"] }),
      ]);
    },
  });
}
