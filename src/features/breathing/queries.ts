import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMindfulnessSessionsByNames,
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { breathingSlugs } from "@/src/constants/breathing";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const breathingKeys = {
  list: (userId: string) => ["breathing", "list", userId] as const,
  count: (userId: string) => ["breathing", "count", userId] as const,
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

// Counts sessions of the built-in patterns only: a custom exercise's sessions carry
// that exercise's id as their name, and resolving those ids here would cost a second
// query per render. The hub tile is a summary, and useBreathingSessions makes the
// same default (customIds = []).
export function useBreathingSessionCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? breathingKeys.count(userId) : ["breathing", "count", "anonymous"],
    queryFn: () => countMindfulnessSessionsByNames(userId!, [...breathingSlugs]),
    enabled: Boolean(userId),
  });
}

export function useSaveBreathingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("breathing");
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
