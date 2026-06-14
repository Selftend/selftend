import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMoodLogs,
  deleteMoodLog,
  getMoodLog,
  listMoodLogs,
  saveMoodLog,
} from "@/src/features/mood/repository";
import type { MoodInput } from "@/src/features/mood/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";

const moodKeys = {
  all: ["mood"] as const,
  list: (userId: string, limit: number) => ["mood", "list", userId, limit] as const,
  history: (userId: string) => ["mood", "history", userId] as const,
  detail: (userId: string, id: string) => ["mood", "detail", userId, id] as const,
  count: (userId: string) => ["mood", "count", userId] as const,
};

export function useMoodLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? moodKeys.list(userId, limit) : ["mood", "list", "anonymous", limit],
    queryFn: () => listMoodLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

// Canonical recent-history window. The CBT and progress/tracker screens previously kept
// two SEPARATE large queries (180 and 200 rows) over the same table, so cold navigation
// fetched both and a single mood save refetched both (#60). Consolidate them into one cache
// entry sized to the largest window and let each screen narrow with `select` - slicing the
// newest N is identical to fetching N (both are logged_at desc, limit N). The small 30-row
// widget/tool/editor queries already share a single key and stay on useMoodLogs.
const MOOD_HISTORY_WINDOW = 200;
export function useMoodHistory(userId: string | null, take: number = MOOD_HISTORY_WINDOW) {
  return useQuery({
    queryKey: userId ? moodKeys.history(userId) : ["mood", "history", "anonymous"],
    queryFn: () => listMoodLogs(userId!, MOOD_HISTORY_WINDOW),
    select: (logs) => (take >= MOOD_HISTORY_WINDOW ? logs : logs.slice(0, take)),
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

export function useMoodLogCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? moodKeys.count(userId) : ["mood", "count", "anonymous"],
    queryFn: () => countMoodLogs(userId!),
    enabled: Boolean(userId),
  });
}

export function useDeleteMoodLog(userId: string | null) {
  return useDeleteMutation(userId, deleteMoodLog, moodKeys.all);
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
