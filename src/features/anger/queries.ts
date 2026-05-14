import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAngerLog, listAngerLogs, saveAngerLog } from "@/src/features/anger/repository";
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
    mutationFn: (input: AngerLogInput) => saveAngerLog(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: angerKeys.list(userId) });
    },
  });
}
