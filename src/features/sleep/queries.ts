import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countSleepLogs,
  deleteSleepLog,
  getSleepLog,
  listSleepLogs,
  saveSleepLog,
} from "@/src/features/sleep/repository";
import type { SleepInput } from "@/src/features/sleep/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";

const sleepKeys = {
  all: ["sleep"] as const,
  list: (userId: string, limit: number) => ["sleep", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["sleep", "detail", userId, id] as const,
  count: (userId: string) => ["sleep", "count", userId] as const,
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

export function useSaveSleepLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, logId }: { input: SleepInput; logId?: string }) =>
      saveSleepLog(userId!, input, logId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: sleepKeys.all });
    },
  });
}

export function useDeleteSleepLog(userId: string | null) {
  return useDeleteMutation(userId, deleteSleepLog, sleepKeys.all);
}
