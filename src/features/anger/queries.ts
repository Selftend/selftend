import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAngerLog,
  getAngerLog,
  listAngerLogs,
  saveAngerLog,
} from "@/src/features/anger/repository";
import type { AngerLogInput } from "@/src/features/anger/types";

const angerKeys = {
  all: ["anger"] as const,
  list: (userId: string) => ["anger", "list", userId] as const,
  detail: (userId: string, logId: string) => ["anger", "detail", userId, logId] as const,
};

export function useAngerLogs(userId: string | null) {
  return useQuery({
    queryKey: userId ? angerKeys.list(userId) : ["anger", "list", "anonymous"],
    queryFn: () => listAngerLogs(userId!),
    enabled: Boolean(userId),
  });
}

export function useAngerLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: userId && logId ? angerKeys.detail(userId, logId) : ["anger", "detail", "anonymous"],
    queryFn: () => getAngerLog(userId!, logId!),
    enabled: Boolean(userId && logId),
  });
}

export function useSaveAngerLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, logId }: { input: AngerLogInput; logId?: string }) =>
      saveAngerLog(userId!, input, logId),
    onSuccess: async (log) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: angerKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: angerKeys.detail(userId, log.id) }),
      ]);
    },
  });
}

export function useDeleteAngerLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => deleteAngerLog(userId!, logId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: angerKeys.list(userId) });
    },
  });
}
