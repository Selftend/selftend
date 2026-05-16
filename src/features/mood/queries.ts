import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteMoodLog,
  getMoodLog,
  listMoodLogs,
  saveMoodLog,
} from "@/src/features/mood/repository";
import type { MoodInput } from "@/src/features/mood/types";

const moodKeys = {
  all: ["mood"] as const,
  list: (userId: string, limit: number) => ["mood", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["mood", "detail", userId, id] as const,
};

export function useMoodLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? moodKeys.list(userId, limit) : ["mood", "list", "anonymous", limit],
    queryFn: () => listMoodLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useMoodLog(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? moodKeys.detail(userId, id) : ["mood", "detail", "anonymous", id ?? ""],
    queryFn: () => getMoodLog(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useDeleteMoodLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMoodLog(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}

export function useSaveMoodLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, moodLogId }: { input: MoodInput; moodLogId?: string }) =>
      saveMoodLog(userId!, input, moodLogId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}
