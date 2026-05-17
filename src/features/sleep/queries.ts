import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteSleepLog,
  getSleepLog,
  listSleepLogs,
  saveSleepLog,
} from "@/src/features/sleep/repository";
import type { SleepInput } from "@/src/features/sleep/types";

const sleepKeys = {
  all: ["sleep"] as const,
  list: (userId: string, limit: number) => ["sleep", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["sleep", "detail", userId, id] as const,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSleepLog(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: sleepKeys.all });
    },
  });
}
