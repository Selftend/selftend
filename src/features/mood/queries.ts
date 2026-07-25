import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMoodLogs,
  deleteMoodLog,
  getFirstMoodLogDate,
  getMoodLog,
  listMoodLogs,
  listMoodScorePoints,
  saveMoodLog,
} from "@/src/features/mood/repository";
import type { MoodInput } from "@/src/features/mood/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const moodKeys = {
  all: ["mood"] as const,
  list: (userId: string, limit: number) => ["mood", "list", userId, limit] as const,
  history: (userId: string) => ["mood", "history", userId] as const,
  detail: (userId: string, id: string) => ["mood", "detail", userId, id] as const,
  count: (userId: string) => ["mood", "count", userId] as const,
  scorePoints: (userId: string, fromIso: string, toIso?: string) =>
    ["mood", "scorePoints", userId, fromIso, toIso ?? ""] as const,
  firstLogDate: (userId: string) => ["mood", "firstLogDate", userId] as const,
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

// Trend-window query: only timestamp/offset/score come over the wire and there is
// no row limit, so the 200-row history cache is not the trend's ceiling. Lives
// under the "mood" root key, so every save invalidates it with the rest.
export function useMoodScorePoints(userId: string | null, fromIso: string, toIso?: string) {
  return useQuery({
    queryKey: userId
      ? moodKeys.scorePoints(userId, fromIso, toIso)
      : ["mood", "scorePoints", "anonymous", fromIso, toIso ?? ""],
    queryFn: () => listMoodScorePoints(userId!, fromIso, toIso),
    enabled: Boolean(userId),
  });
}

/** Earliest log timestamp — the lower clamp for the custom trend range picker. */
export function useFirstMoodLogDate(userId: string | null) {
  return useQuery({
    queryKey: userId ? moodKeys.firstLogDate(userId) : ["mood", "firstLogDate", "anonymous"],
    queryFn: () => getFirstMoodLogDate(userId!),
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (_data, { moodLogId }) => {
      if (!moodLogId) requestReminderPrompt("mood");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}
