import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listMoodLogs, saveMoodLog } from "@/src/features/mood/repository";
import type { MoodInput } from "@/src/features/mood/types";

const moodKeys = {
  all: ["mood"] as const,
  list: (userId: string, limit: number) => ["mood", "list", userId, limit] as const,
};

export function useMoodLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? moodKeys.list(userId, limit) : ["mood", "list", "anonymous", limit],
    queryFn: () => listMoodLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveMoodLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MoodInput) => saveMoodLog(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}
