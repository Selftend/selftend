import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMindfulnessSessionsExcludingNames,
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { breathingSlugs } from "@/src/constants/breathing";
import { groundingSlugs } from "@/src/constants/grounding";
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

// Counts by exclusion - everything in mindfulness_sessions that is not grounding is a
// breathing session (src/features/routines/derive.ts draws the same line). Counting by
// inclusion over breathingSlugs would drop custom exercises, whose sessions carry the
// custom exercise's id as their name.
export function useBreathingSessionCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? breathingKeys.count(userId) : ["breathing", "count", "anonymous"],
    queryFn: () => countMindfulnessSessionsExcludingNames(userId!, [...groundingSlugs]),
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
