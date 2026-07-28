import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countSleepLogs,
  deleteSleepLog,
  getSleepLog,
  listSleepLogs,
  saveSleepLog,
  sleepStats,
} from "@/src/features/sleep/repository";
import type { SleepInput } from "@/src/features/sleep/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { deviceTimeZone } from "@/src/utils/date";

const sleepKeys = {
  all: ["sleep"] as const,
  list: (userId: string, limit: number) => ["sleep", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["sleep", "detail", userId, id] as const,
  count: (userId: string) => ["sleep", "count", userId] as const,
  // The time zone is part of the key, not just the argument: it decides which civil day
  // each night falls in, so a traveller's stats are genuinely different data rather than
  // a stale copy of the same query.
  stats: (userId: string, timeZone: string) => ["sleep", "stats", userId, timeZone] as const,
};

export function useSleepLogs(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: userId ? sleepKeys.list(userId, limit) : ["sleep", "list", "anonymous", limit],
    queryFn: () => listSleepLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSleepLog(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? sleepKeys.detail(userId, id) : ["sleep", "detail", "anonymous", id ?? ""],
    queryFn: () => getSleepLog(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useSleepLogCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? sleepKeys.count(userId) : ["sleep", "count", "anonymous"],
    queryFn: () => countSleepLogs(userId!),
    enabled: Boolean(userId),
  });
}

// Summary figures for the tracker, aggregated server-side over the whole history rather
// than the 50 logs `useSleepLogs` loads (#256). Every mutation below already invalidates
// the `sleep` prefix, so a logged, edited or deleted night refreshes these too.
export function useSleepStats(userId: string | null) {
  const timeZone = deviceTimeZone();
  return useQuery({
    queryKey: userId
      ? sleepKeys.stats(userId, timeZone)
      : ["sleep", "stats", "anonymous", timeZone],
    queryFn: () => sleepStats(timeZone),
    enabled: Boolean(userId),
  });
}

export function useSaveSleepLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, logId }: { input: SleepInput; logId?: string }) =>
      saveSleepLog(userId!, input, logId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (_data, { logId }) => {
      if (!logId) requestReminderPrompt("sleep");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: sleepKeys.all });
    },
  });
}

export function useDeleteSleepLog(userId: string | null) {
  return useDeleteMutation(userId, deleteSleepLog, sleepKeys.all);
}
